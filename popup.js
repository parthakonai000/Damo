let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('pwa-install-popup');
    const closeBtn = document.getElementById('popup-close-btn');
    const installBtn = document.getElementById('popup-install-btn');

    // পপআপ দিনে একবার দেখানোর লজিক
    function shouldShowPopup() {
        const lastClosed = localStorage.getItem('pwaPopupClosedTime');
        if (!lastClosed) return true; // আগে কখনো বন্ধ না করলে দেখাবে

        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000; // ২৪ ঘণ্টার মিলিসেকেন্ড
        return (now - parseInt(lastClosed)) > oneDay; // ২৪ ঘণ্টা পার হলে আবার দেখাবে
    }

    // ব্রাউজার যখন ইনস্টল করার জন্য প্রস্তুত হবে, তখন ইভেন্টটি ধরবে
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // ডিফল্ট প্রম্পট আটকে দেওয়া
        deferredPrompt = e; // ইভেন্ট সেভ করে রাখা

        if (shouldShowPopup()) {
            popup.style.display = 'flex'; // পপআপ দেখানো
        }
    });

    // ক্রস (X) বাটনে ক্লিক করলে পপআপ বন্ধ হবে এবং আজকের মতো সেভ হবে
    closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        localStorage.setItem('pwaPopupClosedTime', new Date().getTime().toString());
    });

    // ডাউনলোড/ইনস্টল বাটনে ক্লিক করলে
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt(); // ব্রাউজারের আসল ইনস্টল প্রম্পট কল করা
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('App Installed!');
            }
            
            deferredPrompt = null;
            popup.style.display = 'none'; // প্রম্পট দেখানোর পর পপআপ সরিয়ে দেওয়া
        }
    });
});
