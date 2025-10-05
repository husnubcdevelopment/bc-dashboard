// BC Development Dashboard - Configuration

// Google OAuth Configuration
window.CLIENT_ID = '857189998421-7nakrdu1cdm1cl76janm56dkalhl9tc3.apps.googleusercontent.com';
window.SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Root folder ID - Your main "BC Development/Projects" folder
const PROJECTS_ROOT_FOLDER_ID = '1Tv464M-ly8wbxRj9QmboW7YuSn53yqcw';

// Categories Configuration
const CONFIG = {
  projects: [],
  categories: [
    {
      id: "prospectie",
      title: "1. Prospectie",
      icon: "📊",
      colorClass: "bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200",
      items: ["1.01 Haalbaarheidsanalyse"],
      subfolders: []
    },
    {
      id: "overeenkomsten",
      title: "2. Overeenkomsten",
      icon: "✅",
      colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200",
      items: ["2.01 Samenwerkingsovereenkomst"],
      subfolders: []
    },
    {
      id: "stakeholders",
      title: "3. Stakeholders",
      icon: "👥",
      colorClass: "bg-orange-100 border-orange-400 text-orange-900 hover:bg-orange-200",
      items: ["3.01 Architect"],
      subfolders: []
    },
    {
      id: "financien",
      title: "4. Financiën",
      icon: "💰",
      colorClass: "bg-green-100 border-green-400 text-green-900 hover:bg-green-200",
      items: ["4.01 Bank"],
      subfolders: []
    },
    {
      id: "plannen",
      title: "5. Plannen",
      icon: "🗺️",
      colorClass: "bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200",
      items: ["5.01 Uitvoeringsplan"],
      subfolders: []
    },
    {
      id: "omv",
      title: "6. OMV",
      icon: "🏢",
      colorClass: "bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200",
      items: ["6.01 CBS"],
      subfolders: []
    },
    {
      id: "akte",
      title: "7. Akte",
      icon: "📄",
      colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200",
      items: ["7.01 Basisakte", "7.02 Aankoopakte"],
      subfolders: []
    },
    {
      id: "juridisch",
      title: "8. Juridisch",
      icon: "⚖️",
      colorClass: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200",
      items: ["8.01 Contextanalyse"],
      subfolders: []
    },
    {
      id: "adviezen",
      title: "9. Adviezen",
      icon: "💡",
      colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200",
      items: ["9.01 Fluvius"],
      subfolders: []
    },
    {
      id: "marktonderzoek",
      title: "10. Marktonderzoek",
      icon: "📈",
      colorClass: "bg-indigo-100 border-indigo-400 text-indigo-900 hover:bg-indigo-200",
      items: ["10.01 Projecten"],
      subfolders: []
    },
    {
      id: "verslagen",
      title: "11. Verslagen",
      icon: "📋",
      colorClass: "bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200",
      items: ["11.01 Werfverslagen", "11.02 Lobbyverslagen", "11.03 Teamverslagen", "11.04 Studiesverslagen", "11.05 Stadverslagen"],
      subfolders: []
    },
    {
      id: "offertes",
      title: "12. Offertes",
      icon: "📤",
      colorClass: "bg-red-100 border-red-400 text-red-900 hover:bg-red-200",
      items: ["12.01 Studie", "12.02 Bouwrijpmaken", "12.03 Constructie", "12.04 Technieken", "12.05 Afwerking", "12.06 Omgevingsaanleg"],
      subfolders: []
    },
    {
      id: "goedgekeurd",
      title: "13. Goedgekeurde Offertes",
      icon: "✔️",
      colorClass: "bg-red-100 border-red-400 text-red-900 hover:bg-red-200",
      items: [],
      subfolders: []
    }
  ]
};

// Category prefix mapping for folder discovery
const CATEGORY_PREFIX = {
  prospectie: /^1[\s._-]/i,
  overeenkomsten: /^2[\s._-]/i,
  stakeholders: /^3[\s._-]/i,
  financien: /^4[\s._-]/i,
  plannen: /^5[\s._-]/i,
  omv: /^6[\s._-]/i,
  akte: /^7[\s._-]/i,
  juridisch: /^8[\s._-]/i,
  adviezen: /^9[\s._-]/i,
  marktonderzoek: /^10[\s._-]/i,
  verslagen: /^11[\s._-]/i,
  offertes: /^12[\s._-]/i,
  goedgekeurd: /^13[\s._-]/i
};