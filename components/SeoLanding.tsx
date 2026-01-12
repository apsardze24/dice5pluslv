
import React, { useEffect } from 'react';

type LangCode = 'en' | 'ru' | 'es' | 'fr' | 'de';

interface SeoProps {
    lang: LangCode;
    onLangChange: (lang: LangCode) => void;
}

const CONTENT = {
    ru: {
        title: "Dice Wars - Стратегическая Игра в Кости",
        subtitle: "Захватите мир в лучшей пошаговой стратегии Dice Wars (Войны Кубиков)",
        description: "Играйте в Dice Wars онлайн бесплатно. Это тактическая игра, напоминающая Risk, где вы используете кубики для захвата территорий. Развивайте свою империю, сражайтесь с умным ИИ и станьте доминатором на карте.",
        keywords: "Dice Wars, Игра в кости, Стратегия, Risk онлайн, kDice, Пошаговая стратегия, Логическая игра, Захват территорий",
        featuresTitle: "Особенности Игры",
        features: [
            "Умный ИИ: Противники анализируют карту, разрезают территории и объединяют силы.",
            "Процедурные карты: Бесконечное количество вариантов карт и ландшафтов.",
            "Мультиплеер (Локальный): Играйте с друзьями на одном устройстве.",
            "Без регистрации: Начните играть мгновенно в браузере."
        ],
        faqTitle: "Часто задаваемые вопросы (FAQ)",
        faq: [
            { q: "Как играть в Dice Wars?", a: "Выберите свою территорию с 2+ кубиками и атакуйте соседа. Если сумма ваших кубиков больше — вы побеждаете и захватываете землю." },
            { q: "Как получить больше кубиков?", a: "В конце хода вы получаете кубики, равные размеру вашей самой большой объединенной территории." },
            { q: "Это бесплатно?", a: "Да, Dice Wars полностью бесплатна и не требует скачивания." },
            { q: "Есть ли здесь мультиплеер?", a: "В данный момент поддерживается игра против умного ИИ или локальный режим (Hotseat) для друзей." }
        ]
    },
    en: {
        title: "Dice Wars - Strategy Dice Game",
        subtitle: "Conquer the world in the ultimate turn-based strategy Dice Wars",
        description: "Play Dice Wars online for free. A tactical game similar to Risk where you use dice to conquer territories. Grow your empire, fight smart AI, and dominate the map.",
        keywords: "Dice Wars, Dice Game, Strategy Game, Risk online, Turn-based strategy, Territory conquest, Board game",
        featuresTitle: "Game Features",
        features: [
            "Smart AI: Opponents analyze the map, split territories, and unify forces.",
            "Procedural Maps: Infinite map layouts and landscapes.",
            "Local Multiplayer: Play with friends on one device.",
            "No Registration: Start playing instantly in your browser."
        ],
        faqTitle: "Frequently Asked Questions (FAQ)",
        faq: [
            { q: "How to play Dice Wars?", a: "Select your territory with 2+ dice and attack a neighbor. If your dice sum is higher, you win and capture the land." },
            { q: "How to get more dice?", a: "At the end of your turn, you get dice equal to the size of your largest connected territory." },
            { q: "Is it free?", a: "Yes, Dice Wars is completely free and requires no download." },
            { q: "Is there multiplayer?", a: "Currently supports smart AI opponents or local Hotseat mode for friends." }
        ]
    },
    es: {
        title: "Dice Wars - Juego de Estrategia con Dados",
        subtitle: "Conquista el mundo en este juego de estrategia por turnos definitivo",
        description: "Juega a Dice Wars online gratis. Un juego táctico similar al Risk donde usas dados para conquistar territorios. Haz crecer tu imperio, lucha contra una IA inteligente y domina el mapa.",
        keywords: "Dice Wars, Guerra de Dados, Juego de estrategia, Risk online, Juego de mesa, Conquista, Juegos de lógica",
        featuresTitle: "Características del Juego",
        features: [
            "IA Inteligente: Los oponentes analizan el mapa, dividen territorios y unifican fuerzas.",
            "Mapas Procedurales: Diseños de mapas y paisajes infinitos.",
            "Multijugador Local: Juega con amigos en un solo dispositivo.",
            "Sin Registro: Empieza a jugar al instante en tu navegador."
        ],
        faqTitle: "Preguntas Frecuentes (FAQ)",
        faq: [
            { q: "¿Cómo jugar a Dice Wars?", a: "Selecciona tu territorio con 2+ dados y ataca a un vecino. Si la suma de tus dados es mayor, ganas y capturas la tierra." },
            { q: "¿Cómo conseguir más dados?", a: "Al final de tu turno, obtienes dados iguales al tamaño de tu territorio conectado más grande." },
            { q: "¿Es gratis?", a: "Sí, Dice Wars es completamente gratuito y no requiere descarga." },
            { q: "¿Hay multijugador?", a: "Actualmente soporta oponentes de IA inteligente o modo local Hotseat para amigos." }
        ]
    },
    fr: {
        title: "Dice Wars - Jeu de Stratégie de Dés",
        subtitle: "Partez à la conquête du monde dans ce jeu de stratégie au tour par tour",
        description: "Jouez à Dice Wars en ligne gratuitement. Un jeu tactique similaire à Risk où vous utilisez des dés pour conquérir des territoires. Développez votre empire, combattez une IA intelligente et dominez la carte.",
        keywords: "Dice Wars, Guerre de Dés, Jeu de stratégie, Risk en ligne, Jeu de société, Conquête de territoire, Jeux de réflexion",
        featuresTitle: "Caractéristiques du Jeu",
        features: [
            "IA Intelligente : Les adversaires analysent la carte, divisent les territoires et unifient les forces.",
            "Cartes Procédurales : Des agencements de cartes et des paysages infinis.",
            "Multijoueur Local : Jouez avec des amis sur un seul appareil.",
            "Sans Inscription : Commencez à jouer instantanément dans votre navigateur."
        ],
        faqTitle: "Foire Aux Questions (FAQ)",
        faq: [
            { q: "Comment jouer à Dice Wars ?", a: "Sélectionnez votre territoire avec 2+ dés et attaquez un voisin. Si la somme de vos dés est supérieure, vous gagnez." },
            { q: "Comment obtenir plus de dés ?", a: "À la fin de votre tour, vous recevez des dés égaux à la taille de votre plus grand territoire connecté." },
            { q: "Est-ce gratuit ?", a: "Oui, Dice Wars est entièrement gratuit et ne nécessite aucun téléchargement." },
            { q: "Y a-t-il un mode multijoueur ?", a: "Prend actuellement en charge des adversaires IA intelligents ou le mode Hotseat local." }
        ]
    },
    de: {
        title: "Dice Wars - Das Würfel-Strategiespiel",
        subtitle: "Erobere die Welt im ultimativen rundenbasierten Strategiespiel Dice Wars",
        description: "Spiele Dice Wars online kostenlos. Ein taktisches Spiel ähnlich wie Risiko, bei dem du Würfel einsetzt, um Gebiete zu erobern. Vergrößere dein Imperium, kämpfe gegen eine intelligente KI und dominiere die Karte.",
        keywords: "Dice Wars, Würfelkriege, Strategiespiel, Risiko online, Würfelspiel, Gebietseroberung, Denkspiel",
        featuresTitle: "Spiel-Features",
        features: [
            "Intelligente KI: Gegner analysieren die Karte, teilen Gebiete und vereinen Streitkräfte.",
            "Prozedurale Karten: Unendliche Kartenlayouts und Landschaften.",
            "Lokaler Multiplayer: Spiele mit Freunden auf einem Gerät.",
            "Keine Registrierung: Spiele sofort in deinem Browser."
        ],
        faqTitle: "Häufig gestellte Fragen (FAQ)",
        faq: [
            { q: "Wie spielt man Dice Wars?", a: "Wähle dein Gebiet mit 2+ Würfeln und greife einen Nachbarn an. Wenn deine Würfelsumme höher ist, gewinnst du." },
            { q: "Wie bekomme ich mehr Würfel?", a: "Am Ende deines Zuges erhältst du Würfel entsprechend der Größe deines größten zusammenhängenden Gebiets." },
            { q: "Ist es kostenlos?", a: "Ja, Dice Wars ist völlig kostenlos und erfordert keinen Download." },
            { q: "Gibt es einen Multiplayer?", a: "Unterstützt derzeit intelligente KI-Gegner oder den lokalen Hotseat-Modus." }
        ]
    }
};

const SeoLanding: React.FC<SeoProps> = ({ lang, onLangChange }) => {
    // Fallback to English if lang is not found (defensive coding)
    const data = CONTENT[lang] || CONTENT['en'];
    
    // SEO: Dynamic Document Title Update
    useEffect(() => {
        document.title = data.title;
        // Optionally update meta description tag if it exists
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', data.description);
        }
    }, [lang, data.title, data.description]);

    // Generate Schema.org JSON-LD
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": "Dice Wars",
        "description": data.description,
        "genre": ["Strategy", "Board Game", "Turn-based"],
        "url": `https://apsardze24.lv/${lang}`,
        "image": "https://apsardze24.lv/og-image.jpg", // Placeholder
        "playMode": "SinglePlayer, MultiPlayer",
        "applicationCategory": "Game",
        "operatingSystem": "Any",
        "inLanguage": [lang],
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "category": "free"
        },
        "author": {
            "@type": "Organization",
            "name": "Apsardze24.lv"
        }
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": data.faq.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
            }
        }))
    };

    return (
        <section className="w-full max-w-4xl mx-auto px-4 py-12 text-gray-300 font-sans">
            {/* Inject JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            
            <header className="text-center mb-12">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {data.title}
                </h1>
                <p className="text-xl text-blue-200 opacity-90">{data.subtitle}</p>
            </header>

            <article className="prose prose-invert max-w-none mb-12">
                <p className="text-lg leading-relaxed mb-6">{data.description}</p>
                
                <h2 className="text-2xl font-bold text-white mt-8 mb-4">{data.featuresTitle}</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.features.map((feature, i) => (
                        <li key={i} className="bg-[#131a33] border border-[#1c2450] p-4 rounded-xl flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </article>

            <section className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">{data.faqTitle}</h2>
                <div className="space-y-6">
                    {data.faq.map((item, i) => (
                        <div key={i} className="border-b border-gray-800 pb-4 last:border-0">
                            <h3 className="text-lg font-semibold text-blue-300 mb-2">{item.q}</h3>
                            <p className="text-gray-400">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
                <p>Keywords: {data.keywords}</p>
                <div className="mt-4 flex justify-center gap-4">
                    {(['en', 'ru', 'es', 'fr', 'de'] as LangCode[]).map(l => (
                         <button 
                            key={l}
                            onClick={() => onLangChange(l)}
                            className={`uppercase font-bold ${lang === l ? 'text-white underline' : 'text-gray-600 hover:text-gray-400'}`}
                         >
                            {l}
                         </button>
                    ))}
                </div>
                <p className="mt-4">© 2024 Dice Wars React. All rights reserved.</p>
            </footer>
        </section>
    );
};

export default SeoLanding;
