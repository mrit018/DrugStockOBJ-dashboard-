# คู่มือการตั้งค่า Google Apps Script (ส่งข้อมูลไปยัง Google Sheets)

คู่มือนี้จะช่วยให้คุณตั้งค่าระบบเพื่อรับข้อมูลรายงานจากแดชบอร์ด เข้าสู่ Google Sheets โดยอัตโนมัติ

## 1. การเตรียม Google Sheets

1. สร้าง Google Sheets ใหม่ หรือเปิดไฟล์ที่ต้องการใช้งาน
2. ตั้งชื่อไฟล์ตามต้องการ (เช่น `DrugStockOBJ_Reports`)
3. จดจำ **Sheet Name** (เช่น `Sheet1`)

## 2. การสร้าง Apps Script

1. ใน Google Sheets ไปที่เมนู **Extensions** (ส่วนขยาย) > **Apps Script**
2. ลบโค้ดเดิมในไฟล์ `Code.gs` ออกให้หมด
3. คัดลอกโค้ดด้านล่างนี้ไปวาง:

```javascript
/**
 * ฟังก์ชันรับข้อมูล POST จาก Web App
 */
function doPost(e) {
  try {
    // รับข้อมูล JSON จาก Request
    var jsonData = JSON.parse(e.postData.contents);
    var hospitalCode = jsonData.hospitalCode;
    var hospitalName = jsonData.hospitalName;
    var reportName = jsonData.reportName;
    var reportDate = jsonData.reportDate;
    var reportData = jsonData.data; // อาร์เรย์ของข้อมูลตาราง
    var timestamp = jsonData.timestamp;

    // เลือก Spreadsheet และ Sheet (เปลี่ยนชื่อ Sheet1 ตามที่คุณตั้งไว้)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];

    // ตรวจสอบว่ามีหัวข้อ (Header) หรือยัง ถ้าไม่มีให้สร้าง
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Hospital Code", "Hospital Name", "Report Name", "Date Range", "Data JSON"]);
    }

    // บันทึกข้อมูลสรุป (1 แถวต่อ 1 การส่ง)
    sheet.appendRow([
      timestamp, 
      hospitalCode, 
      hospitalName, 
      reportName, 
      reportDate, 
      JSON.stringify(reportData)
    ]);

    // --- (ทางเลือก) แยกข้อมูลตารางออกมาทีละแถว ---
    // var detailSheet = ss.getSheetByName("ReportDetails") || ss.insertSheet("ReportDetails");
    // reportData.forEach(function(row) {
    //   detailSheet.appendRow([timestamp, hospitalCode, reportName].concat(Object.values(row)));
    // });

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. การ Deploy เป็น Web App (สำคัญมาก)

1. คลิกที่ปุ่ม **Deploy** (การทำให้ใช้งานได้) > **New deployment** (การทำให้ใช้งานได้ใหม่)
2. เลือกประเภท (Select type) เป็น **Web app**
3. ตั้งค่าการ Deploy:
   - **Description**: `Receive Drug Stock Reports`
   - **Execute as**: `Me` (อีเมลของคุณ)
   - **Who has access**: `Anyone` (ทุกคน - เพื่อให้ระบบจากภายนอกส่งข้อมูลเข้ามาได้)
4. คลิก **Deploy**
5. หากมีหน้าต่างขึ้นมา ให้คลิก **Authorize access** (ให้สิทธิ์การเข้าถึง) และเลือกบัญชี Google ของคุณ (หากขึ้นว่า "Google hasn't verified this app" ให้คลิก Advanced > Go to... (unsafe))
6. เมื่อ Deploy สำเร็จ คุณจะได้รับ **Web App URL** (ตัวอย่าง: `https://script.google.com/macros/s/.../exec`)
7. **คัดลอก URL นี้ไว้**

## 4. การเชื่อมต่อกับแดชบอร์ด

1. เปิดไฟล์ `src/pages/PharmacyAnalytics.tsx` ในโปรเจคของคุณ
2. ค้นหาบรรทัด:
   ```typescript
   const GOOGLE_APP_SCRIPT_URL = 'YOUR_GOOGLE_APP_SCRIPT_WEB_APP_URL_HERE';
   ```
3. แทนที่ `'YOUR_GOOGLE_APP_SCRIPT_WEB_APP_URL_HERE'` ด้วย **URL** ที่คุณคัดลอกมาในขั้นตอนที่ 3
4. บันทึกไฟล์และรันแอปพลิเคชันใหม่

## การทดสอบ

1. เข้าไปที่หน้าแดชบอร์ด และเลือกเมนู **คลังยาและเวชภัณฑ์**
2. กดปุ่ม **ส่ง Google** ในส่วนของรายงานที่ต้องการ
3. ตรวจสอบใน Google Sheets ของคุณ จะพบข้อมูลใหม่เพิ่มเข้ามาในแถวสุดท้าย

---
*หมายเหตุ: เนื่องจาก Apps Script ทำงานแบบ async ข้อมูลอาจใช้เวลา 1-2 วินาทีก่อนจะปรากฏใน Google Sheets*
