export const locales = ['en', 'pt', 'fr', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

type UIStrings = {
  nav: {
    casa: string;
    studio: string;
    shop: string;
    aljezur: string;
    location: string;
    contact: string;
  };
  tagline: string;
  sections: {
    casa: string;
    studio: string;
    shop: string;
    aljezur: string;
    location: string;
    contact: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    dates: string;
    message: string;
    send: string;
    whatsapp: string;
    emailUs: string;
  };
  footer: {
    al: string;
    privacy: string;
  };
  comingSoon: {
    title: string;
    body: string;
    toEnglish: string;
  };
};

export const ui: Record<Locale, UIStrings> = {
  en: {
    nav: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur', location: 'Location', contact: 'Enquire' },
    tagline: 'A townhouse in Aljezur.',
    sections: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur & surroundings', location: 'Location', contact: 'Enquire' },
    contact: { name: 'Name', email: 'Email', phone: 'Phone', dates: 'Dates (optional)', message: 'Message', send: 'Send enquiry', whatsapp: 'Message on WhatsApp', emailUs: 'Email us' },
    footer: { al: 'Alojamento Local', privacy: 'Privacy' },
    comingSoon: { title: 'Translation in progress', body: 'This page is being prepared in your language. In the meantime, the English version is available.', toEnglish: 'Continue in English' },
  },
  pt: {
    nav: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur', location: 'Localização', contact: 'Reservar' },
    tagline: 'Uma casa em Aljezur.',
    sections: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur e arredores', location: 'Localização', contact: 'Reservar' },
    contact: { name: 'Nome', email: 'E-mail', phone: 'Telefone', dates: 'Datas (opcional)', message: 'Mensagem', send: 'Enviar', whatsapp: 'Contactar por WhatsApp', emailUs: 'Enviar e-mail' },
    footer: { al: 'Alojamento Local', privacy: 'Privacidade' },
    comingSoon: { title: 'Tradução em curso', body: 'Esta página está a ser preparada na sua língua. Entretanto, a versão em inglês está disponível.', toEnglish: 'Continuar em inglês' },
  },
  fr: {
    nav: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur', location: 'Situation', contact: 'Réserver' },
    tagline: 'Une maison de village à Aljezur.',
    sections: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur et ses environs', location: 'Situation', contact: 'Réserver' },
    contact: { name: 'Nom', email: 'E-mail', phone: 'Téléphone', dates: 'Dates (facultatif)', message: 'Message', send: 'Envoyer', whatsapp: 'Écrire sur WhatsApp', emailUs: 'Nous écrire' },
    footer: { al: 'Alojamento Local', privacy: 'Confidentialité' },
    comingSoon: { title: 'Traduction en préparation', body: 'Cette page est en cours de traduction. La version anglaise est disponible en attendant.', toEnglish: 'Continuer en anglais' },
  },
  de: {
    nav: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur', location: 'Lage', contact: 'Anfragen' },
    tagline: 'Ein Stadthaus in Aljezur.',
    sections: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur und Umgebung', location: 'Lage', contact: 'Anfragen' },
    contact: { name: 'Name', email: 'E-Mail', phone: 'Telefon', dates: 'Daten (optional)', message: 'Nachricht', send: 'Anfrage senden', whatsapp: 'Per WhatsApp schreiben', emailUs: 'E-Mail schreiben' },
    footer: { al: 'Alojamento Local', privacy: 'Datenschutz' },
    comingSoon: { title: 'Übersetzung in Arbeit', body: 'Diese Seite wird gerade in Ihre Sprache übersetzt. Die englische Fassung ist in der Zwischenzeit verfügbar.', toEnglish: 'Auf Englisch weiterlesen' },
  },
  es: {
    nav: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur', location: 'Ubicación', contact: 'Reservar' },
    tagline: 'Una casa de pueblo en Aljezur.',
    sections: { casa: 'Casa Indigo', studio: 'Studio Indigo', shop: 'FairlyWorn', aljezur: 'Aljezur y alrededores', location: 'Ubicación', contact: 'Reservar' },
    contact: { name: 'Nombre', email: 'Correo', phone: 'Teléfono', dates: 'Fechas (opcional)', message: 'Mensaje', send: 'Enviar', whatsapp: 'Escribir por WhatsApp', emailUs: 'Enviar correo' },
    footer: { al: 'Alojamento Local', privacy: 'Privacidad' },
    comingSoon: { title: 'Traducción en preparación', body: 'Esta página se está preparando en su idioma. Mientras tanto, la versión en inglés está disponible.', toEnglish: 'Continuar en inglés' },
  },
};
