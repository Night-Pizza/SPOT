# SPOT: Next-Gen Attendance Management System

**SPOT** is an advanced, multi-factor attendance tracking platform designed for higher education institutions. It moves beyond traditional methods by integrating AI-driven verification and geofencing to ensure academic integrity.

---

## 🚀 Key Features

### 🛡️ Multi-Factor Verification (MFV)
Professors can dynamically toggle security layers for each session:
* **Dynamic QR Scanning:** Secure, time-limited QR codes for instant student check-in.
* **AI Face Recognition:** Real-time identity verification using computer vision to prevent "proxy" attendance.
* **Geofencing & Location Tracking:** Cross-references GPS data to ensure the student is physically present in the designated classroom.

### 👨‍🏫 Administrative Powerhouse
* **Dynamic Security Levels:** Choose which verification methods (QR, Face ID, Geo) to apply per class.
* **Advanced Analytics:** Detailed attendance reports with export options (CSV).

### 📱 User-Centric Interface
* **Student Dashboard:** Seamless, one-tap check-in experience with a clean, responsive web interface.
* **Professor Portal:** Functional management interface for real-time monitoring and historical data analysis.

---

## 🛠 Tech Stack

* **Backend:** Java 21, Spring Boot 3+, Spring Security (OAuth2/JWT).
* **Database:** PostgreSQL (Relational data & Attendance logs).
* **Frontend:** React, TypeScript, Vite.
* **AI/ML:** Face recognition integration for identity validation.
* **DevOps:** Docker & Docker Compose for orchestrated deployment, GitHub Actions for CI/CD.

---

## ⚙️ Getting Started & Installation

### Prerequisites
Before you begin, ensure you have the following installed:
* **[Docker Desktop](https://www.docker.com/products/docker-desktop)** 

### 🐳 Quick Start
The easiest way to launch the entire SPOT environment (Database, Backend API, and Frontend) is by using Docker Compose.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Night-Pizza/SPOT.git
   cd SPOT
   ```

2. **Configure Environment Variables:**
   * Rename `env.example` to `.env` in the root directory.
   * Fill the data that is required.

3. **Build and start the services:**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application:**
   * **Frontend Interface:** `http://localhost:80`
   * **Backend API:** `http://localhost:8080`

To stop the application, run: `docker-compose down`
