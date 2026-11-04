// আপনার গুগল শিটের আইডি এখানে দিন (শিটের URL-এ /d/ এবং /edit এর মাঝের অংশটি)
const SPREADSHEET_ID = "1YprUYAJ1miBmfFjNcYIBOHJoH2XVlfLpQ5kZ_4BhDvY";

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var date = new Date();
    var userName = data.userName || "Unknown";
    var levelCompleted = data.levelCompleted || 0;
    var practiceCount = data.practiceCount || 0;
    var streak = data.streak || 0;
    
    // শিটের সমস্ত ডেটা রিড করা (ইউজার খোঁজার জন্য)
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var foundRow = -1;
    
    // ২য় সারি থেকে খোঁজা শুরু (কারণ ১ম সারিতে হেডার থাকবে)
    for (var i = 1; i < values.length; i++) {
      if (values[i][1] == userName) { // Column B (ইনডেক্স 1) হলো User Name
        foundRow = i + 1; // শিটের সারি নম্বর 1 থেকে শুরু হয়
        break;
      }
    }
    
    if (foundRow > -1) {
      // যদি ইউজার পাওয়া যায়, তবে সেই সারির ডেটা আপডেট করা
      sheet.getRange(foundRow, 1).setValue(date);             // Column A: Date
      sheet.getRange(foundRow, 3).setValue(levelCompleted);   // Column C: Levels Completed
      sheet.getRange(foundRow, 4).setValue(practiceCount);    // Column D: Practice Count
      sheet.getRange(foundRow, 5).setValue(streak);           // Column E: Streak
    } else {
      // যদি ইউজার না থাকে, তবে নতুন সারি যোগ করা
      sheet.appendRow([date, userName, levelCompleted, practiceCount, streak]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
