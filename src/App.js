import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set
} from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import './App.css';

// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyCJ76eUpV5wvVlrZLKbd3S1k2gM6PsngB4",
  authDomain: "wheelchair-15ba8.firebaseapp.com",
  databaseURL: "https://wheelchair-15ba8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wheelchair-15ba8",
  storageBucket: "wheelchair-15ba8.firebasestorage.app",
  messagingSenderId: "524149398157",
  appId: "1:524149398157:web:a80a23e12980181c1320c4"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ================= APP =================
function App() {

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [mpu, setMpu] = useState({});
  const [heart, setHeart] = useState({ current: 0, avg: 0, last: 0 });

  const [gps, setGps] = useState({ lat: 0, lng: 0 });
  const [wifiGps, setWifiGps] = useState({ lat: 0, lng: 0 });
  // NEW: State for phone location
  const [phoneGps, setPhoneGps] = useState({ lat: 0, lng: 0 });

  const [status, setStatus] = useState("UNKNOWN");
  const [alerts, setAlerts] = useState([]);
  const [lastAlert, setLastAlert] = useState(null);

  const [mode, setMode] = useState("wifi");

  const CCTV_URL =
    "https://snide-surpass-ongoing.ngrok-free.dev/?action=stream";

  // ================= AUTO LOGIN =================
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ================= LOGIN =================
  const handleLogin = async () => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // ================= FIREBASE =================
  useEffect(() => {
    if (!user) return;

    onValue(ref(db, "mpu6050"), (s) => {
      if (s.exists()) setMpu(s.val());
    });

    onValue(ref(db, "heart_rate"), (s) => {
      if (s.exists()) setHeart(p => ({ ...p, current: s.val() }));
    });

    onValue(ref(db, "heart_rate_avg"), (s) => {
      if (s.exists()) setHeart(p => ({ ...p, avg: s.val() }));
    });

    onValue(ref(db, "last_saved_heart_rate"), (s) => {
      if (s.exists()) setHeart(p => ({ ...p, last: s.val() }));
    });

    onValue(ref(db, "latitude"), (s) => {
      if (s.exists()) setGps(p => ({ ...p, lat: s.val() }));
    });

    onValue(ref(db, "longitude"), (s) => {
      if (s.exists()) setGps(p => ({ ...p, lng: s.val() }));
    });

    onValue(ref(db, "wifi_latitude"), (s) => {
      if (s.exists()) setWifiGps(p => ({ ...p, lat: s.val() }));
    });

    onValue(ref(db, "wifi_longitude"), (s) => {
      if (s.exists()) setWifiGps(p => ({ ...p, lng: s.val() }));
    });

    // NEW: Listeners for phone location
    onValue(ref(db, "phone_latitude"), (s) => {
      if (s.exists()) setPhoneGps(p => ({ ...p, lat: s.val() }));
    });

    onValue(ref(db, "phone_longitude"), (s) => {
      if (s.exists()) setPhoneGps(p => ({ ...p, lng: s.val() }));
    });

    onValue(ref(db, "mpu6050/status"), (s) => {
      if (s.exists()) setStatus(s.val());
    });

    onValue(ref(db, "alerts"), (snap) => {
      if (!snap.exists()) return;

      const data = snap.val();
      const list = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .reverse();

      setAlerts(list);
      setLastAlert(list[0]);
    });

    onValue(ref(db, "mode"), (s) => {
      if (s.exists()) setMode(s.val());
    });

  }, [user]);

  useEffect(() => {
    if (!user) return;
    set(ref(db, "mode"), mode);
  }, [mode]);

  // NEW: Updated logic to include phone coordinates based on active mode
  let lat = 0;
  let lng = 0;
  if (mode === "gps") {
    lat = gps.lat;
    lng = gps.lng;
  } else if (mode === "wifi") {
    lat = wifiGps.lat;
    lng = wifiGps.lng;
  } else if (mode === "phone") {
    lat = phoneGps.lat;
    lng = phoneGps.lng;
  }

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&output=embed`;

  // ================= LOGIN =================
  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <h1>Login</h1>
        {error && <p style={{ color: "red" }}>{error}</p>}

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleLogin} style={styles.button}>
          Login
        </button>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div style={styles.container}>

      <h1>🧠 Smart Wheelchair</h1>
      <button onClick={handleLogout} style={styles.button}>Logout</button>

      {/* STATUS */}
      <div style={styles.card}>
        <h2>Status: {status}</h2>
      </div>

      {/* CCTV FULL WIDTH FIXED */}
      <div style={styles.cardFull}>
        <h2>📷 CCTV</h2>

        <div style={styles.camWrap}>
          <iframe
            src={CCTV_URL}
            style={styles.cam}
            allowFullScreen
          />
        </div>
      </div>

      {/* HEART */}
      <div style={styles.card}>
        <h2>❤️ Heart Rate</h2>
        <p>{heart.current}</p>
        <p>Avg: {heart.avg}</p>
        <p>Last: {heart.last}</p>
      </div>

      {/* MPU */}
      <div style={styles.card}>
        <h2>📊 MPU6050</h2>
        <p>AX: {mpu.ax}</p>
        <p>AY: {mpu.ay}</p>
        <p>AZ: {mpu.az}</p>
        <p>Total: {mpu.total_acc}</p>
      </div>

      {/* LOCATION */}
      <div style={styles.card}>
        <h2>📍 Location Mode</h2>
        
        {/* NEW: Added PHONE button */}

         <button 
          onClick={() => setMode("phone")} 
          style={{ ...styles.button, opacity: mode === "phone" ? 1 : 0.5 }}
        >
          PHONE
        </button>
        
        <button 
          onClick={() => setMode("wifi")} 
          style={{ ...styles.button, opacity: mode === "wifi" ? 1 : 0.5 }}
        >
          WiFi
        </button>
        <button 
          onClick={() => setMode("gps")} 
          style={{ ...styles.button, opacity: mode === "gps" ? 1 : 0.5 }}
        >
          GPS
        </button>

       

        <iframe 
          src={mapUrl} 
          style={{ width: "100%", height: 300, border: "none", borderRadius: "10px", marginTop: "10px" }} 
        />
      </div>

      {/* LAST ALERT */}
      <div style={styles.card}>
        <h2>🚨 Last Alert</h2>
        {lastAlert ? (
          <>
            <p>{lastAlert.type}</p>
            <p>{lastAlert.reason}</p>
            <p>{lastAlert.time}</p>
          </>
        ) : (
          <p>No alerts</p>
        )}
      </div>

    </div>
  );
}

// ================= STYLES =================
const styles = {

  container: {
    background: "#111",
    color: "white",
    minHeight: "100vh",
    padding: "15px",
    boxSizing: "border-box" // Prevents padding from causing horizontal overflow
  },

  card: {
    background: "#222",
    padding: 15,
    margin: "15px 0", // Changed to top/bottom only to prevent horizontal overflow
    borderRadius: 10
  },

  cardFull: {
    background: "#222",
    padding: 15,
    margin: "15px 0", // Changed to top/bottom only to prevent horizontal overflow
    borderRadius: 10,
    width: "100%",
    boxSizing: "border-box"
  },

  camWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center", // This centers the iframe
    alignItems: "center",
    background: "#1a1a1a", // Optional: slight background distinction
    borderRadius: "10px",
    padding: "10px 0"
  },

  cam: {
    width: "640px",      // Strict width so the flexbox can center it (matches standard camera res)
    maxWidth: "100%",    // Keeps it responsive on mobile
    height: "480px",     // Strict height to match
    border: "none",
    borderRadius: "10px"
  },

  loginContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#111",
    color: "white"
  },

  input: {
    padding: 10,
    margin: 5,
    width: 250,
    borderRadius: 5,
    border: "none"
  },

  button: {
    padding: "10px 20px",
    margin: 5,
    background: "green",
    color: "white",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontWeight: "bold",
    transition: "opacity 0.2s"
  }
};

export default App;