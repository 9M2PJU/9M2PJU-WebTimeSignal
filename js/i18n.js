/**
 * 9M2PJU WebTimeSignal - Internationalization (i18n)
 * Supported languages: English (en), Bahasa Melayu (ms), 日本語 (ja)
 */

export const translations = {
    en: {
        title: "9M2PJU WebTimeSignal",
        subtitle: "Browser-based LF Radio Time Signal Transmitter & Clock Synchronizer",
        protocol: "Time Signal Standard",
        timeSource: "Time Source & Sync",
        syncNtp: "Sync NTP (Atomic Time)",
        ntpStatusSynced: "Synced with atomic internet time",
        ntpStatusLocal: "Using local system clock",
        ntpStatusSyncing: "Synchronizing with atomic time servers...",
        ntpStatusFailed: "NTP sync unavailable (using local clock)",
        offset: "Offset",
        rtt: "RTT Latency",
        start: "Start Transmission",
        stop: "Stop Transmission",
        testTone: "Test 1s Carrier Tone",
        volume: "Output Volume",
        stereoAntiPhase: "Anti-Phase Differential Stereo Drive (2x Coil Voltage)",
        stereoAntiPhaseDesc: "Inverts Right audio channel 180° to double magnetic flux induction across earphone coils.",
        harmonicOverdrive: "WaveShaper Harmonic Overdrive",
        harmonicOverdriveDesc: "Enhances steep square wave transitions for stronger 3rd/5th harmonic RF radiation.",
        summerTime: "Enable Summer Time / Daylight Saving Time (DST)",
        customTimeToggle: "Manual Time Override / Custom Timezone",
        timeZone: "Timezone",
        bitstreamTitle: "60-Second Real-Time Frame Inspector",
        currentSec: "Second",
        symbolType: "Symbol",
        fieldLabel: "Field",
        instructionsTitle: "How to Use",
        step1: "1. Connect standard wired earphones into the headphone jack or USB-C/Lightning audio adapter.",
        step2: "2. Wrap the earphone cable 2 to 4 times around your radio-controlled clock near its internal antenna.",
        step3: "3. Set your device volume to 100% (Maximum).",
        step4: "4. Click 'Start Transmission' and trigger manual reception (REC/WAVE) on your watch/clock.",
        step5: "5. Wait 2 to 5 minutes for the timepiece to receive and validate 2–3 full frames, then click 'Stop'.",
        safetyTitle: "Safety Warning & Hearing Protection",
        safetyText: "DO NOT PUT EARPHONES IN OR NEAR YOUR EARS. This software emits high-amplitude high-frequency square waves (12–20 kHz) at 100% volume. Place earphones directly on or around the clock body only.",
        theoryTitle: "Operating Theory",
        theoryText: "Consumer audio sound cards cannot output 40–77.5 kHz directly due to the 20 kHz DAC ceiling. This tool generates high-amplitude square waves whose strong 3rd or 5th odd harmonics (e.g. 13.333 kHz × 3 = 40.0 kHz, 15.5 kHz × 5 = 77.5 kHz) radiate electromagnetic signals picked up by the timepiece's internal ferrite coil.",
        compatTitle: "Supported Clocks & Watch Models",
        compatCasio: "Casio: G-Shock Multi-Band 6 / Multi-Band 5, Wave Ceptor, Pro Trek, Edifice, Oceanus, Lineage.",
        compatCitizen: "Citizen: Eco-Drive Radio-Controlled, Attesa, Promaster, Exceed, Perfex Multi 3000.",
        compatSeiko: "Seiko: Radio Wave Control, Brightz, Dolce & Exceline, Spirit Smart, and Seiko Wall/Desk Clocks.",
        compatOther: "Other Brands: Junghans Mega, Braun, Rhythm, La Crosse Technology, AcuRite, Oregon Scientific, TFA Dostmann.",
        compatNotSupported: "Not Supported: GPS-only watches (Citizen Satellite Wave, Seiko GPS Astron in satellite mode), Bluetooth-only watches without radio receivers, and standard mechanical/quartz watches.",
        footer: "Open-source project maintained by 9M2PJU. Based on original concept by shogo82148."
    },
    ms: {
        title: "9M2PJU WebTimeSignal",
        subtitle: "Pemancar Isyarat Masa Radio Gelombang Panjang (LF) & Penyegerak Jam Berasaskan Pelayar Web",
        protocol: "Piawaian Isyarat Masa",
        timeSource: "Sumber Masa & Penyelarasan",
        syncNtp: "Segerak NTP (Masa Atom)",
        ntpStatusSynced: "Disegerakkan dengan masa atom internet",
        ntpStatusLocal: "Menggunakan jam peranti tempatan",
        ntpStatusSyncing: "Sedang menyegerak dengan pelayan masa atom...",
        ntpStatusFailed: "Penyegerakan NTP tidak tersedia (menggunakan jam tempatan)",
        offset: "Selisih",
        rtt: "Pendaman RTT",
        start: "Mula Pemancaran",
        stop: "Henti Pemancaran",
        testTone: "Uji Nada Pembawa 1s",
        volume: "Kelantangan Output",
        stereoAntiPhase: "Pemacu Pembezaan Stereo Anti-Fasa (2x Voltan Gegelung)",
        stereoAntiPhaseDesc: "Menyongsangkan saluran audio Kanan 180° untuk menggandakan aruhan fluks magnet pada gegelung fon telinga.",
        harmonicOverdrive: "Gandaan Harmonik WaveShaper",
        harmonicOverdriveDesc: "Menajamkan peralihan gelombang segi empat bagi menghasilkan pancaran RF harmonik ke-3/ke-5 yang lebih kuat.",
        summerTime: "Aktifkan Waktu Musim Panas (DST)",
        customTimeToggle: "Tetapan Masa Manual / Zon Waktu Khas",
        timeZone: "Zon Waktu",
        bitstreamTitle: "Pemeriksa Bingkai Masa Nyata 60-Saat",
        currentSec: "Saat",
        symbolType: "Simbol",
        fieldLabel: "Medan Data",
        instructionsTitle: "Panduan Penggunaan",
        step1: "1. Sambungkan fon telinga berwayar standard ke bicu audio atau penyesuai USB-C/Lightning.",
        step2: "2. Lilitkan kabel fon telinga 2 hingga 4 kali di sekeliling jam kawalan radio anda berhampiran antenanya.",
        step3: "3. Tetapkan kelantangan peranti anda kepada 100% (Maksimum).",
        step4: "4. Klik 'Mula Pemancaran' dan aktifkan mod penerimaan manual (REC/WAVE) pada jam anda.",
        step5: "5. Tunggu 2 hingga 5 minit untuk jam menerima dan mengesahkan 2–3 bingkai penuh, kemudian klik 'Henti'.",
        safetyTitle: "Amaran Keselamatan & Perlindungan Pendengaran",
        safetyText: "JANGAN MASUKKAN FON TELINGA KE DALAM TELINGA ANDA. Aplikasi ini memancarkan gelombang segi empat berfrekuensi tinggi (12–20 kHz) pada kelantangan 100%. Letakkan fon telinga hanya pada badan jam.",
        theoryTitle: "Prinsip Operasi",
        theoryText: "Kad bunyi audio biasa tidak dapat mengeluarkan frekuensi 40–77.5 kHz secara terus kerana had DAC 20 kHz. Aplikasi ini menjana gelombang segi empat yang menghasilkan harmonik ganjil ke-3 atau ke-5 (cth. 13.333 kHz × 3 = 40.0 kHz, 15.5 kHz × 5 = 77.5 kHz) untuk memancarkan isyarat elektromagnet ke antena ferit jam.",
        compatTitle: "Model Jam Tangan & Jam Dinding yang Disokong",
        compatCasio: "Casio: G-Shock Multi-Band 6 / Multi-Band 5, Wave Ceptor, Pro Trek, Edifice, Oceanus, Lineage.",
        compatCitizen: "Citizen: Eco-Drive Radio-Controlled, Attesa, Promaster, Exceed, Perfex Multi 3000.",
        compatSeiko: "Seiko: Radio Wave Control, Brightz, Dolce & Exceline, Spirit Smart, serta jam dinding/meja Seiko.",
        compatOther: "Jenama Lain: Junghans Mega, Braun, Rhythm, La Crosse Technology, AcuRite, Oregon Scientific, TFA Dostmann.",
        compatNotSupported: "Tidak Disokong: Jam satelit GPS sahaja (Citizen Satellite Wave, Seiko GPS Astron dalam mod satelit), jam Bluetooth sahaja tanpa penerima radio, dan jam mekanikal/kuarza biasa.",
        footer: "Projek sumber terbuka diselenggara oleh 9M2PJU. Berdasarkan konsep asal oleh shogo82148."
    },
    ja: {
        title: "9M2PJU WebTimeSignal",
        subtitle: "Webブラウザで動作する標準電波送信シミュレータ＆電波時計同期ツール",
        protocol: "標準電波プロトコル",
        timeSource: "時刻ソースと同期",
        syncNtp: "NTP原子時計と同期",
        ntpStatusSynced: "インターネット原子時計と同期完了",
        ntpStatusLocal: "ローカル端末の時計を使用中",
        ntpStatusSyncing: "NTPサーバーと同期中...",
        ntpStatusFailed: "NTP同期失敗（端末の時計を使用）",
        offset: "時刻偏差",
        rtt: "RTT遅延",
        start: "送信開始 (Start)",
        stop: "送信停止 (Stop)",
        testTone: "1秒搬送波テスト音",
        volume: "出力音量",
        stereoAntiPhase: "逆相ディファレンシャル駆動（コイル電圧2倍）",
        stereoAntiPhaseDesc: "右チャンネルの位相を180°反転させ、イヤホンコイルにかかる磁束密度と電位差を2倍にします。",
        harmonicOverdrive: "WaveShaper高調波オーバードライブ",
        harmonicOverdriveDesc: "矩形波の立ち上がり/立ち下がりを急峻にし、第3・第5高調波の電波放射を強化します。",
        summerTime: "夏時間（サマータイム）を有効にする",
        customTimeToggle: "手動時刻設定 / タイムゾーン指定",
        timeZone: "タイムゾーン",
        bitstreamTitle: "60秒タイムフレーム・リアルタイムインスペクタ",
        currentSec: "秒",
        symbolType: "シンボル",
        fieldLabel: "データ項目",
        instructionsTitle: "使い方",
        step1: "1. パソコンやスマホのイヤホンジャックにイヤホンを接続します。",
        step2: "2. 電波時計の内蔵アンテナ付近にイヤホンコードを2〜4回巻き付けます。",
        step3: "3. 端末の音量を最大（100%）に設定します。",
        step4: "4. 「送信開始」を押し、電波時計の強制受信ボタン（REC/WAVE等）を長押しします。",
        step5: "5. 時計が信号を受信し、時刻が合うまで2〜5分程度待った後、「送信停止」を押します。",
        safetyTitle: "安全上のご注意・聴覚保護",
        safetyText: "イヤホンを絶対に耳に装着しないでください。本ソフトウェアは最大音量で12〜20 kHzの高周波矩形波を出力します。イヤホンは必ず時計の周囲にのみ配置してください。",
        theoryTitle: "動作原理",
        theoryText: "一般的な音声回路は20 kHz以上の再生に対応していませんが、13.333 kHzの矩形波を最大音量で出力することで生じる第3高調波（約40 kHz）を利用し、イヤホンから微弱な電波を放射して電波時計に受信させます。",
        compatTitle: "対応する時計・電波時計モデル",
        compatCasio: "カシオ (Casio): G-Shock Multi-Band 6 / Multi-Band 5, Wave Ceptor, Pro Trek, Edifice, Oceanus, Lineage など。",
        compatCitizen: "シチズン (Citizen): エコ・ドライブ電波時計, アテッサ (Attesa), プロマスター (Promaster), エクシード (Exceed), Perfex Multi 3000 など。",
        compatSeiko: "セイコー (Seiko): 電波修正クロック (Radio Wave Control), ブライツ (Brightz), ドルチェ＆エクセリーヌ, スピリット, セイコー置時計・掛時計など。",
        compatOther: "その他のメーカー: ユンハンス (Junghans Mega), ブラウン (Braun), リズム時計 (Rhythm), La Crosse Technology, AcuRite, Oregon Scientific, TFA Dostmann など。",
        compatNotSupported: "非対応の時計: GPS専用衛星時計（Citizen Satellite Wave, Seiko GPS AstronのGPS衛星モード）、電波受信アンテナ非搭載のBluetooth専用時計、通常の機械式・クォーツ時計。",
        footer: "9M2PJU によりメンテナンスされているオープンソースプロジェクトです。原作者 shogo82148 の成果に基づいています。"
    }
};

export class I18n {
    constructor(defaultLang = 'en') {
        const saved = localStorage.getItem('web_time_signal_lang');
        this.currentLang = saved || (['ms', 'ja'].includes(navigator.language?.slice(0, 2)) ? navigator.language.slice(0, 2) : 'en');
        if (!translations[this.currentLang]) this.currentLang = defaultLang;
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('web_time_signal_lang', lang);
            this.updateDOM();
        }
    }

    t(key) {
        return translations[this.currentLang]?.[key] || translations['en'][key] || key;
    }

    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                el.value = text;
            } else {
                el.textContent = text;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        document.documentElement.lang = this.currentLang;
    }
}
