# 🏥 Nile Valley Hospital EMR

A premium, state-of-the-art Electronic Medical Record (EMR) system built with **Next.js 16**, **React 19**, and **Appwrite**. Designed for modern healthcare facilities to streamline patient workflows, clinical consultations, and hospital operations.

---

## ✨ Features

- **🛡️ Secure RBAC**: Comprehensive Role-Based Access Control for Doctors, Nurses, Lab Technicians, Pharmacists, Front Desk, and Admins.
- **⚡ Advanced Consultation Suite**: Multi-step, modular consultation flow for symptoms, diagnosis, prescriptions, and lab requests.
- **📊 Real-time Queue Management**: Intelligent patient lifecycle tracking from registration to discharge.
- **💊 Pharmacy & Lab Integration**: Seamless communication between clinical diagnosis and supporting departments.
- **💳 Integrated Billing**: streamlined payment processing and checkout workflows.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16.1.6 (App Router)](https://nextjs.org/) |
| **Library** | [React 19.2.0](https://react.dev/) |
| **Backend** | [Appwrite](https://appwrite.io/) |
| **Database** | Supabase (SSR) / Appwrite Databases |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **UI Components** | [Radix UI](https://www.radix-ui.com/) + Custom Design System |
| **Type Safety** | TypeScript |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/nilevalleyhospital.git
   cd nilevalleyhospital
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root and add your configuration (see [Environment Setup](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/ARCHITECTURE.md#L285)).

4. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) (or the port specified in console) to see the application.

---

## 📂 Documentation

We maintain localized documentation for different aspects of the system:

- [🏗️ System Architecture](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/ARCHITECTURE.md)
- [📜 API Reference](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/API_REFERENCE.md)
- [🔄 Patient Status Flow](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/PATIENT_STATUS_FLOW.md)
- [💾 State Management](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/STATE_MANAGEMENT.md)

*Historical documentation and implementation reports can be found in the [`/docs/history`](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/docs/history) directory.*

---

## 🔐 Security & Proxy

The system uses a modern network proxy layer for security and RBAC enforcement. See [proxy.ts](file:///c:/Users/MAFIA/Documents/Projects/Apps/webapps/nilevalleyhospital/proxy.ts) for details.

---

## 📄 License

Private - All rights reserved. Nile Valley Hospital EMR.
