import React, { useState, useEffect } from "react";
import "./App.css";
import { XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";
import Box from "@mui/material/Box";

// import { LocalPoliceIcon, HotelIcon } from '@mui/icons-material';
import LocalPoliceIcon from "@mui/icons-material/LocalPolice";
import HotelIcon from "@mui/icons-material/Hotel";
import Check from "@mui/icons-material/Check";
import AltRouteIcon from "@mui/icons-material/AltRoute";

import { DataGrid } from "@mui/x-data-grid";

function App() {
  const [xmlFile, setXmlFile] = useState(null);
  const [xlsFile, setXlsFile] = useState(null);
  const [routingFile, setRoutingFile] = useState(null);

  const [isKbsFileSet, setIsKbsFileSet] = useState(false);
  const [isOperaFileSet, setIsOperaFileSet] = useState(false);
  const [isRoutingFileSet, setIsRoutingFileSet] = useState(false);

  const [operaJSON, setOperaJSON] = useState(null);
  const [kbsJSON, setKbsJSON] = useState(null);
  const [routingJSON, setRoutingJSON] = useState(null);

  const [operaNames, setOperaNames] = useState([]);
  const [kbsNames, setKbsNames] = useState([]);
  const [routingNames, setRoutingNames] = useState([]);

  const [kbsDiff, setKbsDiff] = useState([]);
  const [operaDiff, setOperaDiff] = useState([]);

  const [mergedDiffArray, setMergedDiffArray] = useState(undefined);
  const [operaControlData, setOperaControlData] = useState([]);

  const parser = new XMLParser();

  const columns = [
    {
      field: "oda_no",
      headerName: "Oda No",
      width: 70,
    },
    {
      field: "olan_kisi_sayisi",
      headerName: "Olan Kişi",
      width: 30,
    },
    {
      field: "yazilan_kisi_sayisi",
      headerName: "Yazilan Kişi",
      width: 30,
    },
    {
      field: "rate_kod",
      headerName: "Rate Kod",
      width: 90,
    },
    {
      field: "sirket_adi",
      headerName: "Sirket Adi",
      width: 160,
    },
    {
      field: "payment_method",
      headerName: "Payment Metod",
      sortable: false,
      width: 30,
    },
    {
      field: "oda_ucreti",
      headerName: "Oda Ucreti",
      type: "number",
      width: 80,
      sortable: false,
    },
    {
      field: "para_tipi",
      headerName: "Para Tipi",
      type: "number",
      width: 50,
      sortable: false,
    },
    {
      field: "comment",
      headerName: "Comment",
      sortable: false,
      width: 200,
    },
    {
      field: "routed_to",
      headerName: "routed_to",
      sortable: false,
      width: 100,
    },
    {
      field: "routed_from",
      headerName: "routed_from",
      sortable: false,
      width: 100,
    },
  ];

  useEffect(() => {
    if (xlsFile != null) handleXlsFileRead();
  }, [xlsFile]);

  useEffect(() => {
    if (xmlFile != null) handleXmlFileRead();
  }, [xmlFile]);

  useEffect(() => {
    if (routingFile != null) handleRoutingFileRead();
  }, [routingFile]);

  // opera dosyasından isim ve oda numalarını alıyoruz.
  useEffect(() => {
    if (operaJSON != null) {
      let tempArray = [];
      for (let index = 0; index < operaJSON.length; index++) {
        tempArray.push({
          room: operaJSON[index].ROOM,
          name: getFirstName(operaJSON[index].FULL_NAME),
        });

        if (operaJSON[index].ACCOMPANYING_NAMES !== "") {
          let accompanies = [];
          accompanies = operaJSON[index].ACCOMPANYING_NAMES.split("/");
          accompanies.map((item) => {
            tempArray.push({
              room: operaJSON[index].ROOM,
              name: getFirstName(item),
            });
          });
        }
      }
      setOperaNames(tempArray);
    }
  }, [operaJSON]);

  // routingjson dan sadece gerekli olan yerleri alıyoruz
  useEffect(() => {
    if (routingJSON != null) {
      let tempArray = [];
      let tempObj = {}
      for (let index = 0; index < routingJSON.length; index++) {

        let status_code = routingJSON[index].SHORT_RESV_STATUS;

        if (
          status_code !== "CKOT" &&
          status_code !== "CXL"  &&
          routingJSON[index].ROOM_NO <= 1000
        ) {
          tempObj = {
            room: routingJSON[index].ROOM_NO,
            company: routingJSON[index].C_T_S_NAME.substring(3),
            status_code: status_code,
          };

          tempObj.routed_from = "";
          tempObj.routed_to = "";

          if (Array.isArray(routingJSON[index].LIST_G_ROUTING.G_ROUTING)) {

            tempObj.route_text = routingJSON[index].LIST_G_ROUTING.G_ROUTING

            tempObj.route_text.forEach(routeObj => {
              const trxString = routeObj.TRX_STRING || '';

              if (trxString.startsWith('Routed from')) {
                let str = trxString.substring('Routed from'.length).trim() ;
                tempObj.routed_from += extractInfoBasedOnType(str) + " | "
              } else if (trxString.startsWith('Routed to')) {
                let str = trxString.substring('Routed to'.length).trim() ;
                tempObj.routed_to += extractInfoBasedOnType(str) + " | "
              }

            });

          } else {

            tempObj.route_text = routingJSON[index].LIST_G_ROUTING.G_ROUTING.TRX_STRING

            if (tempObj.route_text.startsWith('Routed from')) {
              tempObj.routed_from = extractInfoBasedOnType(tempObj.route_text.substring('Routed from'.length).trim());
            } else if (tempObj.route_text.startsWith('Routed to')) {
              tempObj.routed_to = extractInfoBasedOnType(tempObj.route_text.substring('Routed to'.length).trim());
            } else {
              tempObj.routed_from = "hatalı";
              tempObj.routed_to = "hatalı";
            }

          }

          tempArray.push(tempObj)

        }
      }

      setRoutingNames(tempArray);
    }
  }, [routingJSON]);

  function extractInfoBasedOnType(str) {
    const trimmedStr = str.trim(); // Başındaki ve sonundaki boşlukları temizle

    if (/^\d/.test(trimmedStr)) {
      // Eğer string bir sayı ile başlıyorsa, ilk boşluğa kadar olan kısmı al
      return trimmedStr.split(' ')[0];
    } else {
      // Eğer string bir harf veya başka karakterle başlıyorsa, tam string'i al
      return trimmedStr;
    }
  }

  // routing dosyasını opera control datasına ekliyoruz
  useEffect( () => {
    const updatedOperaControlData = [...operaControlData];

    routingNames.forEach((routingItem, i) => {
      // Eğer oda numarası yoksa, unique bir oda numarası atayın
      const roomNumber = routingItem.room || `UnknownRoom_${i + 1}`;

      const index = updatedOperaControlData.findIndex(controlItem => controlItem.oda_no === routingItem.room);
      if (index !== -1) {
        updatedOperaControlData[index] = {
          ...updatedOperaControlData[index],
          routed_company: routingItem.company,
          routed_from: routingItem.routed_from,
          routed_to: routingItem.routed_to
        };
      } else {
        updatedOperaControlData.push({
          oda_no: roomNumber,
          routed_company: routingItem.company,
          routed_from: routingItem.routed_from,
          routed_to: routingItem.routed_to
        });
      }
    });

    setOperaControlData(updatedOperaControlData);

  },[routingNames]) 


  // opera dosyasında gece kontrolleri için olan kısımı alıyoruz
  useEffect(() => {
    if (operaJSON != null) {
      let tempArrayControl = [];
      let tempObjControl = {};
      // console.log(operaJSON);
      let isNotesSelected = true;

      if (
        typeof operaJSON[0].LIST_G_COMMENT_RESV_NAME_ID
          .G_COMMENT_RESV_NAME_ID === "undefined"
      ) {
        isNotesSelected = false;
        // console.log("notes secilmedi");
      }

      for (let index = 0; index < operaJSON.length; index++) {
        tempObjControl = {
          oda_no: operaJSON[index].ROOM,
          rate_kod: operaJSON[index].RATE_CODE,
          oda_ucreti: operaJSON[index].SHARE_AMOUNT,
          para_tipi: operaJSON[index].CURRENCY_CODE,
          sirket_adi: operaJSON[index].COMPANY_NAME.substring(3),
          payment_method: operaJSON[index].PAYMENT_METHOD,
        };

        // yorum kısmı
        if (isNotesSelected) {
          let isMultipleComment = false;
          if (
            Array.isArray(
              operaJSON[index].LIST_G_COMMENT_RESV_NAME_ID
                .G_COMMENT_RESV_NAME_ID,
            )
          ) {
            isMultipleComment = true;
          }

          if (isMultipleComment) {
            tempObjControl.comment =
              operaJSON[
                index
              ].LIST_G_COMMENT_RESV_NAME_ID.G_COMMENT_RESV_NAME_ID[0].RES_COMMENT;
            // console.log("çoklu yorum");
          } else {
            tempObjControl.comment =
              operaJSON[
                index
              ].LIST_G_COMMENT_RESV_NAME_ID.G_COMMENT_RESV_NAME_ID.RES_COMMENT;
            // console.log("tek yorum");
          }
        } else {
          tempObjControl.comment = "notes secilmedi";
        }

        // olan kişi sayısı
        const olan_kisi_sayisi = getPersonCountByRoom(
          operaNames,
          operaJSON[index].ROOM,
        );
        tempObjControl.olan_kisi_sayisi = olan_kisi_sayisi;

        // yazılan kişi sayısı
        let yazilan_kisi_sayisi;
        if (operaJSON[index].CHILDREN == 0) {
          yazilan_kisi_sayisi = operaJSON[index].ADULTS;
        } else {
          yazilan_kisi_sayisi =
            operaJSON[index].ADULTS.toString() +
            "/" +
            operaJSON[index].CHILDREN.toString();
        }
        tempObjControl.yazilan_kisi_sayisi = yazilan_kisi_sayisi;

        tempArrayControl.push(tempObjControl);
      }
      // console.log(tempArrayControl);
      setOperaControlData(tempArrayControl);
    }
  }, [operaJSON, operaNames]);

  function getPersonCountByRoom(operaNames, roomNumber) {
    const filteredNames = operaNames.filter(
      (person) => person.room === roomNumber,
    );
    return filteredNames.length;
  }

  // kbs dosyasından isim ve oda numalarını alıyoruz
  useEffect(() => {
    if (kbsJSON != null) {
      let tempArray = [];
      // console.log(kbsJSON);
      for (let index = 0; index < kbsJSON.length; index++) {
        if (kbsJSON[index]["Adý"] != undefined) {
          tempArray.push({
            room: kbsJSON[index]["Oda No"],
            name: reshapeName(kbsJSON[index]["Adý"]),
          });
        }
        if (kbsJSON[index]["Adı"] != undefined) {
          tempArray.push({
            room: kbsJSON[index]["Oda No"],
            name: reshapeName(kbsJSON[index]["Adı"]),
          });
        }
      }
      tempArray.sort((a, b) => a.room - b.room);
      setKbsNames(tempArray);
    }
  }, [kbsJSON]);

  // kbs ve gih dosyası yüklenince farklı olanlarını buluyoruz
  useEffect(() => {
    if (kbsJSON != null && operaJSON != null) {
      findDifferentElements(kbsNames, operaNames);

      let tempDizi = mergeArrays(kbsDiff, operaDiff);
      tempDizi = tempDizi.sort((a, b) => a.room - b.room);

      setMergedDiffArray(tempDizi);
    }
  }, [
    kbsJSON,
    operaJSON,
    kbsNames,
    operaNames,
    kbsDiff.length,
    operaDiff.length,
  ]);

  // sadece ilk adı alıyor
  const getFirstName = (fullName) => {
    var nameParts = fullName?.split(",");
    var firstName = nameParts[1]?.trim()?.toUpperCase();
    return firstName;
  };

  const reshapeName = (str) => {
    var name = str?.trim();
    name = name
      .replaceAll("Ğ", "g")
      .replaceAll("Ü", "u")
      .replaceAll("Ş", "s")
      .replaceAll("I", "i")
      .replaceAll("İ", "i")
      .replaceAll("Ö", "o")
      .replaceAll("Ç", "c")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replaceAll("Ý", "I")
      .replaceAll("ý", "i")
      .replaceAll("Ð", "G")
      .replaceAll("Ð", "g")
      .replaceAll("Þ", "s")
      .replaceAll("Þ", "S");

    name = name.toUpperCase();
    return name;
  };

  const handleXmlFileChange = (event) => {
    const file = event.target.files[0];
    setXmlFile(file);
    setIsOperaFileSet(true);
  };

  const handleXlsFileChange = (event) => {
    const file = event.target.files[0];
    setXlsFile(file);
    setIsKbsFileSet(true);
  };

  const handleRoutingFileChange = (event) => {
    const file = event.target.files[0];
    setRoutingFile(file);
    setIsRoutingFileSet(true);
  };

  const handleXmlFileRead = () => {
    if (xmlFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const xmlContent = event.target.result;
        let jObj = parser.parse(xmlContent);
        setOperaJSON(jObj.GIBYROOM.LIST_G_ROOM.G_ROOM);
      };
      reader.readAsText(xmlFile);
    }
  };

  const handleRoutingFileRead = () => {
    if (routingFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const routingContent = event.target.result;
        let jObj = parser.parse(routingContent);
        setRoutingJSON(
          jObj.ROUTING_DETAILS.LIST_G_GROUP1_SORT.G_GROUP1_SORT
            .LIST_G_GROUP2_SORT.G_GROUP2_SORT.LIST_G_ROOM_NO.G_ROOM_NO,
        );
      };
      reader.readAsText(routingFile);
    }
  };

  const handleXlsFileRead = () => {
    if (xlsFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" }); // veya readXlsxFile(file)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
        setKbsJSON(jsonData);
      };
      reader.readAsArrayBuffer(xlsFile);
    }
  };

  function findDifferentElements(arr1, arr2) {
    const tempKbsDiff = [];
    const tempOperaDiff = [];

    // Dizi 1'in elemanlarını kontrol et
    for (let i = 0; i < arr1.length; i++) {
      let found = false;

      // Dizi 2'de aynı elemanı ara
      for (let j = 0; j < arr2.length; j++) {
        if (arr1[i].room === arr2[j].room && arr1[i].name === arr2[j].name) {
          found = true;
          break;
        }
      }
      // Dizi 2'de bulunamayan elemanları farklı elemanlar listesine ekle
      if (!found) {
        let tempArray = {
          room: arr1[i].room,
          name: arr1[i].name,
        };
        tempKbsDiff.push(tempArray);
      }
    }

    // Dizi 2'deki elemanları kontrol et
    for (let i = 0; i < arr2.length; i++) {
      let found = false;

      // Dizi 1'de aynı elemanı ara
      for (let j = 0; j < arr1.length; j++) {
        if (arr2[i].room === arr1[j].room && arr2[i].name === arr1[j].name) {
          found = true;
          break;
        }
      }

      // Dizi 1'de bulunamayan elemanları farklı elemanlar listesine ekle
      if (!found) {
        let tempArray = {
          room: arr2[i].room,
          name: arr2[i].name,
        };
        tempOperaDiff.push(tempArray);
      }
    }
    setKbsDiff(tempKbsDiff);
    setOperaDiff(tempOperaDiff);
  }

  function mergeArrays(kbsDizisi, operaDizisi) {
    var mergeDizisi = [];

    // kbsDizisi'ndeki her bir öğeyi mergeDizisi'ne ekleyin veya güncelleyin
    for (var i = 0; i < kbsDizisi.length; i++) {
      var kbsObj = kbsDizisi[i];
      let existingObj = mergeDizisi.find(function (obj) {
        return obj.room === kbsObj.room;
      });

      if (existingObj) {
        existingObj.kbsNames.push(kbsObj.name);
      } else {
        let newMergeObj = {
          room: kbsObj.room,
          kbsNames: [kbsObj.name],
          operaNames: [],
        };
        mergeDizisi.push(newMergeObj);
      }
    }

    // operaDizisi'ndeki her bir öğeyi mergeDizisi'ne ekleyin veya güncelleyin
    for (var j = 0; j < operaDizisi.length; j++) {
      var operaObj = operaDizisi[j];
      let existingObj = mergeDizisi.find(function (obj) {
        return obj.room === operaObj.room;
      });

      if (existingObj) {
        if (!existingObj.operaNames.includes(operaObj.name)) {
          existingObj.operaNames.push(operaObj.name);
        }
      } else {
        let newMergeObj = {
          room: operaObj.room,
          kbsNames: [],
          operaNames: [operaObj.name],
        };
        mergeDizisi.push(newMergeObj);
      }
    }

    return mergeDizisi;
  }

  const handleClick = (event) => {
    // console.log(kbsDiff);
    // console.log(operaJSON, kbsJSON);
    // console.log("kbsJSON :", kbsJSON);

    console.log("operajson :", operaJSON);
    console.log("opera names :", operaNames);

    // console.log("kbsNames :", kbsNames);
    // console.log("mergedDiffArray :", mergedDiffArray);

    console.log("operaControlData :", operaControlData);
    console.log("routingJSON :", routingJSON);
    console.log("routingNames :", routingNames);
  };

  return (
    <div className="flex flex-col justify-center">
      <div className={`file-input-container justify-center py-4 `}>
        <div
          className={`file-input ${isKbsFileSet ? "file-input-success" : ""}`}
        >
          <input
            type="file"
            id="file1"
            accept=".xlsx"
            onChange={handleXlsFileChange}
          />
          <label className="file-input-label">
            <LocalPoliceIcon className="file-input-icon" />
            KBS Dosyası
            {isKbsFileSet && <Check className="file-input-checkmark" />}
          </label>
          <br />
          <label>{isKbsFileSet && kbsNames?.length + " kişi"}</label>
        </div>
        <div
          className={`file-input ${isOperaFileSet ? "file-input-success" : ""}`}
        >
          <input
            type="file"
            id="file2"
            accept=".xml"
            onChange={handleXmlFileChange}
          />

          <label className="file-input-label">
            <HotelIcon className="file-input-icon" />
            Opera Dosyası
            {isOperaFileSet && <Check className="file-input-checkmark" />}
          </label>
          <br />
          <label>{isOperaFileSet && operaNames?.length + " kişi"}</label>
        </div>
        <div
          className={`file-input ${isRoutingFileSet ? "file-input-success" : ""}`}
        >
          <input
            type="file"
            id="file3"
            accept=".xml"
            onChange={handleRoutingFileChange}
          />

          <label className="file-input-label">
            <AltRouteIcon className="file-input-icon" />
            Routing Dosyası
            {isRoutingFileSet && <Check className="file-input-checkmark" />}
          </label>
          <br />
          {/* <label>{isOperaFileSet && operaNames?.length + " kişi"}</label> */}
        </div>

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="button"
          onClick={handleClick}
        >
          btnn
        </button>
      </div>

      <div className="w-full px-8 flex justify-center">
        <div className="w-1/4 pr-16 bg-grey-400">
          <div className="max-w-xl ">
            <table className="table relative">
              <thead className="top-0 sticky">
                <tr>
                  <th>Oda No</th>
                  <th>KBS'DEKİ İSİM</th>
                  <th>OPERA'DAKİ İSİM</th>
                </tr>
              </thead>
              <tbody>
                {mergedDiffArray ? (
                  mergedDiffArray.length > 0 ? (
                    mergedDiffArray.map((item, j) => (
                      <tr key={j}>
                        <td className="w-20">{item.room}</td>
                        <td>
                          {item.kbsNames?.map((name, k) => (
                            <tr key={k}>
                              <td>{name}</td>
                            </tr>
                          ))}
                        </td>
                        <td>
                          {item.operaNames?.map((name, l) => (
                            <tr key={l}>
                              <td>{name}</td>
                            </tr>
                          ))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>Hata yok.</td>
                    </tr>
                  )
                ) : (
                  <tr>
                    <td colSpan={3}>
                      {mergedDiffArray === undefined
                        ? "Veri yok."
                        : "Veri yükleniyor..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full ">
          <Box sx={{ height: 800, width: "100%" }}>
            <DataGrid
              rows={operaControlData}
              getRowId={(row) => row?.oda_no}
              columns={columns}
              initialState={{}}
              disableRowSelectionOnClick
              disablePagination
              disableColumnMenu
            />
          </Box>
        </div>
      </div>
    </div>
  );
}

export default App;
