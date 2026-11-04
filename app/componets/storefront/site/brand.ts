// One place for the public company details used across the website.
export const COMPANY = {
  name: "2A Construction",
  legalName: "2A Construction Ltd",
  companyNo: "15102296",
  phone: "+44 7903 095967",
  phoneHref: "tel:+447903095967",
  whatsapp: "https://wa.me/447903095967",
  email: "2a.construction.uk@gmail.com",
  emailHref: "mailto:2a.construction.uk@gmail.com",
  area: "London & the Home Counties",
  hours: [
    { days: "Monday – Friday", time: "8:00 – 18:00" },
    { days: "Saturday", time: "9:00 – 14:00" },
    { days: "Sunday", time: "Closed" },
  ],
  areas: ["Enfield", "Barnet", "Haringey", "Waltham Forest", "Islington", "Camden", "Hackney", "Harrow", "Brent", "Hertfordshire", "Essex borders"],
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100095250444954",
    instagram: "https://www.instagram.com/2a.construction.ltd/",
    linkedin: "https://uk.linkedin.com/company/2a-construction-ltd",
  },
  guaranteeYears: 5,
} as const;

export const NAVY = "#071a33";
export const YELLOW = "#f5b400";
