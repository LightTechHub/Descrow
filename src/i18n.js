import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome_to_dealcross: 'Secure Escrow Payments',
      subtitle: 'for Global Trade',
      your_trusted_escrow: 'Protect your online transactions with our trusted escrow service. Buy and sell with confidence, anywhere in the world.',
      get_started: 'Get Started Free',
      learn_more: 'See How It Works',
      view_docs: 'View Documentation'
    }
  },
  es: {
    translation: {
      welcome_to_dealcross: 'Pagos de Escrow Seguros',
      subtitle: 'para el Comercio Global',
      your_trusted_escrow: 'Protege tus transacciones en línea con nuestro servicio de escrow de confianza. Compra y vende con seguridad en cualquier parte del mundo.',
      get_started: 'Comenzar Gratis',
      learn_more: 'Ver Cómo Funciona',
      view_docs: 'Ver Documentación'
    }
  },
  fr: {
    translation: {
      welcome_to_dealcross: 'Paiements Escrow Sécurisés',
      subtitle: 'pour le Commerce Mondial',
      your_trusted_escrow: 'Protégez vos transactions en ligne avec notre service escrow de confiance. Achetez et vendez en toute sécurité, partout dans le monde.',
      get_started: 'Commencer Gratuitement',
      learn_more: 'Voir Comment Ça Marche',
      view_docs: 'Voir la Documentation'
    }
  },
  de: {
    translation: {
      welcome_to_dealcross: 'Sichere Treuhand-Zahlungen',
      subtitle: 'für den Welthandel',
      your_trusted_escrow: 'Schützen Sie Ihre Online-Transaktionen mit unserem vertrauenswürdigen Treuhandservice. Kaufen und verkaufen Sie sicher, überall auf der Welt.',
      get_started: 'Kostenlos Starten',
      learn_more: 'So Funktioniert Es',
      view_docs: 'Dokumentation Anzeigen'
    }
  },
  zh: {
    translation: {
      welcome_to_dealcross: '安全托管支付',
      subtitle: '用于全球贸易',
      your_trusted_escrow: '通过我们值得信赖的托管服务保护您的在线交易。在世界任何地方都能安心买卖。',
      get_started: '免费开始',
      learn_more: '了解工作原理',
      view_docs: '查看文档'
    }
  },
  ru: {
    translation: {
      welcome_to_dealcross: 'Безопасные Эскроу-Платежи',
      subtitle: 'для Мировой Торговли',
      your_trusted_escrow: 'Защитите свои онлайн-транзакции с помощью нашего надёжного эскроу-сервиса. Покупайте и продавайте уверенно в любой точке мира.',
      get_started: 'Начать Бесплатно',
      learn_more: 'Узнать Как Работает',
      view_docs: 'Просмотр Документации'
    }
  },
  ar: {
    translation: {
      welcome_to_dealcross: 'مدفوعات الضمان الآمنة',
      subtitle: 'للتجارة العالمية',
      your_trusted_escrow: 'احمِ معاملاتك الإلكترونية بخدمة الضمان الموثوقة لدينا. اشترِ وبع بثقة في أي مكان حول العالم.',
      get_started: 'ابدأ مجاناً',
      learn_more: 'شاهد كيف يعمل',
      view_docs: 'عرض الوثائق'
    }
  },
  pt: {
    translation: {
      welcome_to_dealcross: 'Pagamentos de Garantia Seguros',
      subtitle: 'para o Comércio Global',
      your_trusted_escrow: 'Proteja suas transações online com nosso serviço de garantia confiável. Compre e venda com segurança em qualquer lugar do mundo.',
      get_started: 'Começar Gratuitamente',
      learn_more: 'Ver Como Funciona',
      view_docs: 'Ver Documentação'
    }
  },
  ja: {
    translation: {
      welcome_to_dealcross: '安全なエスクロー決済',
      subtitle: 'グローバル取引のために',
      your_trusted_escrow: '信頼できるエスクローサービスでオンライン取引を保護しましょう。世界中どこでも安心して売買できます。',
      get_started: '無料で始める',
      learn_more: '仕組みを見る',
      view_docs: 'ドキュメントを見る'
    }
  },
  hi: {
    translation: {
      welcome_to_dealcross: 'सुरक्षित एस्क्रो भुगतान',
      subtitle: 'वैश्विक व्यापार के लिए',
      your_trusted_escrow: 'हमारी विश्वसनीय एस्क्रो सेवा से अपने ऑनलाइन लेनदेन को सुरक्षित करें। दुनिया में कहीं भी आत्मविश्वास के साथ खरीदें और बेचें।',
      get_started: 'मुफ्त शुरू करें',
      learn_more: 'यह कैसे काम करता है देखें',
      view_docs: 'दस्तावेज़ देखें'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18nextLng') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
