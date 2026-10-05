let selectedBlogger = "";
let userCoins = 150;

function switchTab(tabId) {
    const sections = document.querySelectorAll('main > section');
    sections.forEach((sec) => sec.classList.add('hidden'));

    const activeSection = document.getElementById(`tab-${tabId}`);
    if (activeSection) activeSection.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        const isActive = btn.dataset.target === tabId;
        btn.classList.toggle('text-amber-400', isActive);
        btn.classList.toggle('text-gray-400', !isActive);
    });

    if (tabId === 'leaderboard') loadLeaderboard();
}

function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list || list.children.length > 0) return;

    const bloggers = [
        { name: '@doniyor_qayumov', subs: '1.5M', score: '158,500', growth: '+12%' },
        { name: '@sardor_team', subs: '1.2M', score: '142,100', growth: '+9%' },
        { name: '@khabib_uz', subs: '950K', score: '129,300', growth: '+15%' },
        { name: '@alimoff_f', subs: '880K', score: '115,800', growth: '+7%' },
        { name: '@lolaofficial_', subs: '790K', score: '108,200', growth: '+10%' }
    ];

    bloggers.forEach((blogger, index) => {
        const crownColor = index === 0
            ? 'text-yellow-400'
            : index === 1
                ? 'text-gray-300'
                : index === 2
                    ? 'text-amber-600'
                    : 'text-gray-500';

        list.innerHTML += `
            <div class="vip-card p-3 rounded-xl flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <span class="font-black text-sm w-6 text-center ${crownColor}">#${index + 1}</span>
                    <div>
                        <h4 class="font-bold text-xs text-white">${blogger.name}</h4>
                        <span class="text-[10px] text-gray-400">${blogger.subs} obunachi</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xs font-extrabold gold-text">⭐ ${blogger.score}</span>
                    <span class="text-[10px] text-green-400 block">${blogger.growth}</span>
                </div>
            </div>
        `;
    });
}

function openVerifyModal(blogger) {
    selectedBlogger = blogger;
    const modal = document.getElementById('verify-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeVerifyModal() {
    const modal = document.getElementById('verify-modal');
    if (modal) modal.classList.add('hidden');
}

function confirmVote() {
    alert(`Ovozingiz ${selectedBlogger} uchun qabul qilindi! Telegram botga yo'naltirilmoqda...`);
    closeVerifyModal();

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close();
    }
}

function buyPackage(amount, price) {
    const shouldBuy = confirm(`${price} evaziga ${amount} ta Super Ovoz sotib olishni tasdiqlaysizmi?`);
    if (!shouldBuy) return;

    userCoins += amount;
    const userCoinsEl = document.getElementById('user-coins');
    const profileCoinsEl = document.getElementById('profile-coins');

    if (userCoinsEl) userCoinsEl.innerText = userCoins;
    if (profileCoinsEl) profileCoinsEl.innerText = `${userCoins} Tanga`;

    alert('Muvaffaqiyatli xarid qilindi! Ovozlar balansingizga qo\'shildi.');
}

function updateCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = endOfDay.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    countdownEl.textContent = `${hours}:${minutes}:${seconds}`;
}

document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    setInterval(updateCountdown, 1000);

    const firstTab = document.getElementById('tab-home');
    if (firstTab) firstTab.classList.remove('hidden');

    const initialButtons = document.querySelectorAll('.nav-btn');
    initialButtons.forEach((btn) => {
        btn.classList.toggle('text-amber-400', btn.dataset.target === 'home');
        btn.classList.toggle('text-gray-400', btn.dataset.target !== 'home');
    });

    const telegramApp = window.Telegram && window.Telegram.WebApp;
    if (telegramApp) {
        telegramApp.ready();
        telegramApp.expand();
        telegramApp.setHeaderColor('#0b0b0e');
        telegramApp.setBackgroundColor('#0b0b0e');
    }
});