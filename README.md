<div align="center">

# 🏠 En-Route

### Ukhrul gets real addresses.

**A household address registry platform for Ukhrul, Manipur**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

[Live Demo](https://discoverukhrul.site) • [Report Bug](https://github.com/hex-si/en-route/issues) • [Request Feature](https://github.com/hex-si/en-route/issues)

</div>

---

## 📋 About

**Project EN-ROUTE** is designed to improve delivery transparency and location accuracy throughout **Ukhrul**. Our goal is to build a smarter, more reliable, and community-driven delivery network that benefits customers, delivery partners, and local businesses.

We believe better mapping leads to faster deliveries, fewer errors, and improved accessibility across the region.

> *"We pledge our commitment to serving the community with transparency, reliability, and continuous improvement."*
> — **Hashtag Dropee Team**

---

## ✨ Features

### 🏡 For Residents
- **Google Maps Pin** — Drop a pin on your house location
- **House Photos** — Upload up to 4 photos of your address
- **Household Members** — Add everyone at your address with a phone
- **Points System** — Earn up to 30 points for a complete profile
- **Referral Program** — Earn +10 points for each friend you refer
- **Dashboard** — Track your registration status and points

### 🔐 For Admins
- **User Management** — View, verify, and manage all registrations
- **Request Handling** — Approve or reject update requests
- **Ad Management** — Create, edit, and manage advertisements
- **Updates** — Post announcements and community notices
- **CSV/HTML Export** — Export user data for reporting
- **WhatsApp Notifications** — Notify users about clarification needs

### 📢 Advertising
- **Ad Carousel** — Auto-scrolling ads on landing page and dashboard
- **Image & Video Support** — Upload images or short videos (max 30s)
- **Position Targeting** — Show ads on landing, dashboard, or both

### 🔒 Security
- **Rate Limiting** — 5 login attempts per 15 minutes
- **Security Question** — After 2 wrong passwords
- **Middleware Auth** — Admin routes protected server-side
- **Input Validation** — Whitelist-based field updates

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | SHA-256 hashing, Cookie-based sessions |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/hex-si/en-route.git
cd en-route

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database Setup

Run the migration files in `sql/migrations/` in order (001 through 009) via the Supabase SQL Editor.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
en-route/
├── app/
│   ├── about/           # About Us page
│   ├── admin/           # Admin panel
│   │   ├── ads/         # Ad management
│   │   ├── export/      # Data export
│   │   ├── requests/    # Update requests
│   │   ├── updates/     # Posts management
│   │   └── users/       # User management
│   ├── api/             # API routes
│   ├── check/           # Registration check
│   ├── dashboard/       # User dashboard
│   ├── privacy/         # Privacy & Policy
│   ├── register/        # Registration form
│   └── updates/         # Updates page
├── components/          # Reusable components
├── lib/                 # Utilities & Supabase clients
├── sql/migrations/      # Database migrations
└── middleware.ts        # Auth middleware
```

---

## 🔑 Admin Access

Admin credentials are stored securely in the database with hashed passwords. Contact the project owner for access.

---

## 📊 Database Schema

- **users** — Registered households with location, photos, points
- **household_members** — Family members linked to users
- **admins** — Admin accounts with hashed passwords
- **ads** — Advertisements with images/videos
- **updates** — Announcements and community posts
- **referrals** — Referral tracking between users
- **update_requests** — User-submitted change requests

---

## 🌐 Deployment

This project is deployed on **Vercel** at [discoverukhrul.site](https://discoverukhrul.site)

To deploy your own instance:

1. Fork this repository
2. Connect to Vercel
3. Add environment variables
4. Run migrations on your Supabase project
5. Deploy

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Contact

**Hashtag Dropee** — eX Holdings

- 📱 WhatsApp: [+91 7005498122](https://wa.me/917005498122)
- 📧 Email: [hashtagdropee@gmail.com](mailto:hashtagdropee@gmail.com)
- 📸 Instagram: [@hashtagdropee](https://instagram.com/hashtagdropee)

---

<div align="center">

**Built with ❤️ for Ukhrul**

[↑ Back to Top](#-en-route)

</div>
