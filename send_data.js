/* ==========================================================
   P. K PRACTICE — Send Data to Google Sheets (send_data.js)
   ========================================================== */

async function syncProgressToCloud() {
  // অ্যাপ স্ক্রিপ্ট থেকে পাওয়া Web App URL এখানে দিন
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxohhVIYC8FQvo-1k_3XF_lFVtu0wUdQaa8jd0hEMyJ1-YO4L2IIRCJJcYmpy7wa8As/exec";
  
  const userName = localStorage.getItem('pk_username');
  
  // যদি ইউজার নাম না থাকে, তবে ডেটা পাঠাবে না
  if (!userName) return;

  // আজকের তারিখ বের করা
  const today = new Date().toDateString();
  const lastSyncDate = localStorage.getItem('pk_last_sync_date');

  // যদি আজকের ডেটে আগে থেকেই সিঙ্ক হয়ে থাকে, তবে আর পাঠাবে না
  if (lastSyncDate === today) {
    console.log("আজকের ডেটা আগেই সিঙ্ক হয়ে গেছে, তাই আর রিকোয়েস্ট পাঠানো হলো না।");
    return;
  }
  
  // লোকাল স্টোরেজ থেকে ডেটা কালেক্ট করা
  const completedLessons = JSON.parse(localStorage.getItem('pk_completed_lessons') || "[]");
  const levelCompleted = completedLessons.length;
  
  const practiceCount = parseInt(localStorage.getItem('pk_total_practices') || '0');
  
  const streakData = JSON.parse(localStorage.getItem('pk_streak') || '{"count":0}');
  const streak = streakData.count || 0;

  // ডেটা পেইলন তৈরি
  const payload = {
    userName: userName,
    levelCompleted: levelCompleted,
    practiceCount: practiceCount,
    streak: streak
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    // ডেটা পাঠানো সফল হলে আজকের তারিখটা সেভ করে রাখা
    localStorage.setItem('pk_last_sync_date', today);
    console.log("ডেটা সফলভাবে গুগল শিটে আপডেট করা হয়েছে!", payload);
    
  } catch (error) {
    console.error("ডেটা পাঠাতে সমস্যা হয়েছে:", error);
  }
}
