import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const COLORS = {
  bg: "#0D0D0D",
  surface: "#161616",
  card: "#1E1E1E",
  accent: "#FF6B1A",
  accentGlow: "#FF6B1A33",
  gold: "#F5C842",
  green: "#22C97A",
  blue: "#3B82F6",
  purple: "#A855F7",
  text: "#F0EDE8",
  muted: "#888",
  border: "#2A2A2A",
};

const categories = [
  { id: "all", label: "Semua", icon: "⚡" },
  { id: "otomotif", label: "Otomotif", icon: "🔧" },
  { id: "las", label: "Pengelasan", icon: "🔥" },
  { id: "listrik", label: "Listrik", icon: "💡" },
  { id: "boga", label: "Tata Boga", icon: "👨‍🍳" },
  { id: "konstruksi", label: "Konstruksi", icon: "🏗️" },
  { id: "hvac", label: "HVAC", icon: "❄️" },
];

const courses = [
  {
    id: 1, title: "Tune-Up Mesin Motor 4-Tak dari Nol",
    instructor: "Pak Hendra Wijaya", category: "otomotif",
    duration: "2j 45m", videos: 18, students: 12480,
    rating: 4.9, level: "Pemula", certified: true,
    color: "#FF6B1A", emoji: "🔧",
    tags: ["Karburator", "Busi", "Filter"],
    desc: "Kuasai teknik tune-up motor dari dasar hingga mahir.",
    progress: 65,
    curriculum: [
      { id: 1, title: "Pengenalan Mesin 4-Tak", duration: "5:23" },
      { id: 2, title: "Keselamatan Kerja Bengkel", duration: "8:10" },
      { id: 3, title: "Membongkar Karburator", duration: "12:45" },
      { id: 4, title: "Membersihkan & Menyetel Karburator", duration: "15:30" },
      { id: 5, title: "Pemeriksaan Busi & Pengapian", duration: "20:00" },
      { id: 6, title: "Penyetelan Klep", duration: "10:15" },
      { id: 7, title: "Tune-Up Komplit", duration: "18:40" },
      { id: 8, title: "Ujian Praktik Akhir", duration: "25:00" },
    ]
  },
  {
    id: 2, title: "Las MIG/MAG untuk Konstruksi Baja",
    instructor: "Bu Sari Dewanti", category: "las",
    duration: "3j 20m", videos: 24, students: 8920,
    rating: 4.8, level: "Menengah", certified: true,
    color: "#F5C842", emoji: "🔥",
    tags: ["MIG", "MAG", "Baja Karbon"],
    desc: "Teknik pengelasan profesional sesuai standar SNI.",
    progress: 0,
    curriculum: [
      { id: 1, title: "K3 Pengelasan", duration: "12:10" },
      { id: 2, title: "Mengenal Mesin Las MIG/MAG", duration: "10:45" },
      { id: 3, title: "Setting Gas & Kawat Las", duration: "8:30" },
      { id: 4, title: "Teknik Pengelasan Dasar", duration: "15:20" },
      { id: 5, title: "Posisi Pengelasan 1G & 2G", duration: "20:00" },
      { id: 6, title: "Posisi Pengelasan 3G & 4G", duration: "25:00" },
      { id: 7, title: "Inspeksi Visual Hasil Las", duration: "10:15" },
      { id: 8, title: "Ujian Sertifikasi", duration: "30:00" },
    ]
  },
  {
    id: 3, title: "Instalasi Listrik Rumah Tinggal",
    instructor: "Pak Doni Pratama", category: "listrik",
    duration: "4j 10m", videos: 32, students: 21340,
    rating: 4.9, level: "Pemula", certified: true,
    color: "#3B82F6", emoji: "💡",
    tags: ["Panel Listrik", "MCB", "Grounding"],
    desc: "Pelajari instalasi listrik yang aman sesuai PUIL 2020.",
    progress: 30,
    curriculum: [
      { id: 1, title: "Dasar Kelistrikan", duration: "10:00" },
      { id: 2, title: "PUIL 2020", duration: "15:30" },
      { id: 3, title: "Membaca Gambar Instalasi", duration: "12:45" },
      { id: 4, title: "Pemasangan Panel Listrik", duration: "20:00" },
      { id: 5, title: "Instalasi Kabel & MCB", duration: "18:30" },
      { id: 6, title: "Sistem Grounding", duration: "15:00" },
      { id: 7, title: "Troubleshooting", duration: "10:15" },
      { id: 8, title: "Ujian Komprehensif", duration: "25:00" },
    ]
  },
  {
    id: 4, title: "Masak Nasi Padang Skala Komersial",
    instructor: "Chef Rina Marlina", category: "boga",
    duration: "5j 00m", videos: 40, students: 34200,
    rating: 5.0, level: "Semua Level", certified: false,
    color: "#22C97A", emoji: "👨‍🍳",
    tags: ["Rendang", "Gulai", "Sambal"],
    desc: "Resep autentik Minang untuk usaha catering.",
    progress: 0,
    curriculum: [
      { id: 1, title: "Bumbu Dasar Masakan Padang", duration: "15:00" },
      { id: 2, title: "Teknik Memasak Rendang", duration: "25:30" },
      { id: 3, title: "Gulai & Kalio", duration: "20:15" },
      { id: 4, title: "Sambal & Lauk Pendamping", duration: "18:00" },
      { id: 5, title: "Manajemen Dapur Komersial", duration: "15:45" },
      { id: 6, title: "Hitung Biaya & Harga Jual", duration: "12:30" },
      { id: 7, title: "Praktik Masak Lengkap", duration: "45:00" },
      { id: 8, title: "Ujian Memasak", duration: "60:00" },
    ]
  },
  {
    id: 5, title: "Service AC Split Inverter Modern",
    instructor: "Pak Rizky Fauzi", category: "hvac",
    duration: "3j 30m", videos: 28, students: 9870,
    rating: 4.7, level: "Menengah", certified: true,
    color: "#A855F7", emoji: "❄️",
    tags: ["Freon", "Inverter", "PCB"],
    desc: "Kuasai perbaikan AC inverter terbaru.",
    progress: 0,
    curriculum: [
      { id: 1, title: "Prinsip Kerja AC Inverter", duration: "12:00" },
      { id: 2, title: "Alat & Keselamatan Kerja", duration: "8:30" },
      { id: 3, title: "Membongkar Unit", duration: "15:45" },
      { id: 4, title: "Diagnosa Kerusakan PCB", duration: "20:00" },
      { id: 5, title: "Pengisian Freon R32", duration: "10:30" },
      { id: 6, title: "Pembersihan & Perawatan", duration: "15:00" },
      { id: 7, title: "Studi Kasus Umum", duration: "18:00" },
      { id: 8, title: "Ujian Praktik Service", duration: "30:00" },
    ]
  },
  {
    id: 6, title: "Pondasi Bangunan & Pasang Bata",
    instructor: "Pak Ahmad Sobari", category: "konstruksi",
    duration: "6j 15m", videos: 48, students: 15600,
    rating: 4.8, level: "Pemula", certified: true,
    color: "#FF6B1A", emoji: "🏗️",
    tags: ["Pondasi", "Adukan", "Plesteran"],
    desc: "Teknik konstruksi tukang profesional.",
    progress: 10,
    curriculum: [
      { id: 1, title: "Membaca Gambar Kerja", duration: "15:00" },
      { id: 2, title: "Pengukuran & Pematokan", duration: "12:30" },
      { id: 3, title: "Galian Tanah & Urugan", duration: "10:45" },
      { id: 4, title: "Pembesian Pondasi", duration: "20:00" },
      { id: 5, title: "Pengecoran Pondasi", duration: "18:30" },
      { id: 6, title: "Pasang Bata & Adukan", duration: "25:00" },
      { id: 7, title: "Plesteran & Acian", duration: "22:00" },
      { id: 8, title: "Ujian Praktik Konstruksi", duration: "45:00" },
    ]
  },
];

const jobs = [
  { id: 1, title: "Teknisi Motor", company: "Ahass Honda", location: "Jakarta Selatan", salary: "4-6 Juta", category: "otomotif", logo: "🏍️" },
  { id: 2, title: "Welder Konstruksi", company: "PT Waskita Karya", location: "Surabaya", salary: "6-9 Juta", category: "las", logo: "🔩" },
  { id: 3, title: "Teknisi Listrik Gedung", company: "PT Sinar Mas", location: "Bekasi", salary: "5-8 Juta", category: "listrik", logo: "🏢" },
  { id: 4, title: "Chef Junior", company: "Hotel Aryaduta", location: "Bandung", salary: "3,5-5 Juta", category: "boga", logo: "🍽️" },
  { id: 5, title: "Teknisi AC", company: "LG Electronics", location: "Tangerang", salary: "5-7 Juta", category: "hvac", logo: "🌡️" },
];

const userStats = {
  name: "Budi Santoso",
  points: 2840,
  streak: 7,
  certificates: 2,
  rank: "Pengrajin Muda",
  avatar: "👨‍🔧",
  completedCourses: 3,
  totalHours: 24,
};

const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);

function BottomNav({ active, setActive }) {
  const tabs = [
    { id: "home", icon: "⚡", label: "Beranda" },
    { id: "courses", icon: "📚", label: "Kursus" },
    { id: "jobs", icon: "💼", label: "Lowongan" },
    { id: "profile", icon: "👤", label: "Profil" },
  ];
  return (
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#111111EE",backdropFilter:"blur(20px)",borderTop:`1px solid ${COLORS.border}`,display:"flex",zIndex:100,padding:"8px 0 12px"}}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 0"}}>
          <span style={{fontSize:20,filter:active===t.id?"none":"grayscale(1) opacity(0.5)"}}>{t.icon}</span>
          <span style={{fontSize:10,color:active===t.id?COLORS.accent:COLORS.muted,fontWeight:active===t.id?700:400}}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Badge({ text, color = COLORS.accent }) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:600}}>{text}</span>;
}

function CourseCard({ course, onClick, compact = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={() => onClick(course)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{background:COLORS.card,borderRadius:16,overflow:"hidden",border:`1px solid ${hovered?course.color+"55":COLORS.border}`,cursor:"pointer",minWidth:compact?220:"auto",flexShrink:compact?0:1}}>
      <div style={{background:`linear-gradient(135deg,${course.color}33 0%,${course.color}11 100%)`,height:compact?100:120,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:`1px solid ${course.color}22`}}>
        <span style={{fontSize:compact?36:48}}>{course.emoji}</span>
        {course.certified && <span style={{position:"absolute",top:8,right:8,background:COLORS.gold+"22",color:COLORS.gold,border:`1px solid ${COLORS.gold}44`,borderRadius:6,padding:"2px 6px",fontSize:9,fontWeight:700}}>✦ BERSERTIFIKAT</span>}
      </div>
      <div style={{padding:compact?"10px 12px":"12px 14px"}}>
        <Badge text={course.level} color={course.color} />
        <p style={{fontWeight:700,fontSize:compact?12:13,color:COLORS.text,margin:"6px 0 4px"}}>{course.title}</p>
        <p style={{fontSize:10,color:COLORS.muted,margin:"0 0 8px"}}>{course.instructor}</p>
        {!compact && <div style={{display:"flex",gap:10,marginBottom:8}}><span style={{fontSize:10,color:COLORS.muted}}>📹 {course.videos}</span><span style={{fontSize:10,color:COLORS.muted}}>⏱ {course.duration}</span><span style={{fontSize:10,color:COLORS.gold}}>★ {course.rating}</span></div>}
        {course.progress > 0 && <div><div style={{height:3,background:COLORS.border,borderRadius:2}}><div style={{height:"100%",width:`${course.progress}%`,background:course.color,borderRadius:2}} /></div><p style={{fontSize:9,color:COLORS.muted,margin:"3px 0 0"}}>{course.progress}% selesai</p></div>}
      </div>
    </div>
  );
}

function HomeScreen({ setActiveTab, setSelectedCourse }) {
  return (
    <div style={{padding:"0 0 90px"}}>
      <div style={{padding:"20px 20px 16px",background:`linear-gradient(180deg,${COLORS.surface} 0%,transparent 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{color:COLORS.muted,fontSize:11,margin:0}}>Selamat datang kembali 👋</p><h2 style={{fontWeight:800,fontSize:20,color:COLORS.text,margin:"2px 0 0"}}>Budi Santoso</h2></div>
          <div style={{width:44,height:44,borderRadius:14,background:`linear-gradient(135deg,${COLORS.accent}33,${COLORS.accent}11)`,border:`1px solid ${COLORS.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👨‍🔧</div>
        </div>
      </div>
      <div style={{padding:"0 20px 16px"}}>
        <div style={{background:`linear-gradient(135deg,${COLORS.accent} 0%,#FF3D00 100%)`,borderRadius:16,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{margin:0,fontSize:11,color:"#FFFFFF99"}}>Streak Belajar Kamu</p><p style={{margin:"2px 0 0",fontWeight:800,fontSize:26,color:"#FFF"}}>🔥 {userStats.streak} Hari</p></div>
          <div style={{textAlign:"right"}}><p style={{margin:0,fontSize:11,color:"#FFFFFF99"}}>Total Poin</p><p style={{margin:"2px 0 0",fontWeight:800,fontSize:20,color:COLORS.gold}}>✦ {userStats.points.toLocaleString('id-ID')}</p></div>
        </div>
      </div>
      <div style={{padding:"0 20px 20px",display:"flex",gap:10}}>
        {[{label:"Kursus Selesai",value:userStats.completedCourses,icon:"✅"},{label:"Sertifikat",value:userStats.certificates,icon:"🏆"},{label:"Jam Belajar",value:userStats.totalHours,icon:"⏱"}].map((s,i) => (
          <div key={i} style={{flex:1,background:COLORS.card,borderRadius:12,border:`1px solid ${COLORS.border}`,padding:10,textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:2}}>{s.icon}</div><div style={{fontWeight:800,fontSize:18,color:COLORS.text}}>{s.value}</div><div style={{fontSize:9,color:COLORS.muted}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{marginBottom:24}}>
        <div style={{padding:"0 20px 12px"}}><h3 style={{fontWeight:700,fontSize:15,color:COLORS.text,margin:0}}>▶ Lanjutkan Belajar</h3></div>
        <div style={{paddingLeft:20,display:"flex",gap:12,overflowX:"auto",paddingRight:20,scrollbarWidth:"none"}}>
          {inProgressCourses.map(c => <CourseCard key={c.id} course={c} onClick={setSelectedCourse} compact />)}
        </div>
      </div>
      <div>
        <div style={{padding:"0 20px 12px",display:"flex",justifyContent:"space-between"}}><h3 style={{fontWeight:700,fontSize:15,color:COLORS.text,margin:0}}>🔥 Terpopuler</h3><button onClick={() => setActiveTab("courses")} style={{background:"none",border:"none",color:COLORS.accent,fontSize:11,cursor:"pointer"}}>Lihat Semua →</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:12,padding:"0 20px"}}>{courses.slice(0,3).map(c => <CourseCard key={c.id} course={c} onClick={setSelectedCourse} />)}</div>
      </div>
      <div style={{marginTop:24}}>
        <div style={{padding:"0 20px 12px",display:"flex",justifyContent:"space-between"}}><h3 style={{fontWeight:700,fontSize:15,color:COLORS.text,margin:0}}>💼 Lowongan</h3><button onClick={() => setActiveTab("jobs")} style={{background:"none",border:"none",color:COLORS.accent,fontSize:11,cursor:"pointer"}}>Lihat Semua →</button></div>
        <div style={{paddingLeft:20,display:"flex",gap:12,overflowX:"auto",paddingRight:20,scrollbarWidth:"none"}}>
          {jobs.slice(0,3).map(j => (
            <div key={j.id} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:"12px 14px",minWidth:180,flexShrink:0}}>
              <div style={{fontSize:28,marginBottom:6}}>{j.logo}</div><p style={{fontWeight:700,fontSize:12,color:COLORS.text,margin:"0 0 2px"}}>{j.title}</p><p style={{fontSize:10,color:COLORS.muted,margin:"0 0 6px"}}>{j.company}</p><Badge text={j.salary} color={COLORS.green} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursesScreen({ setSelectedCourse }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => courses.filter(c => {
    const matchCat = activeCategory === "all" || c.category === activeCategory;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.instructor.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [activeCategory, search]);

  return (
    <div style={{padding:"16px 0 90px"}}>
      <div style={{padding:"0 20px 14px"}}><h2 style={{fontWeight:800,fontSize:22,color:COLORS.text,margin:"0 0 14px"}}>Semua Kursus</h2>
        <div style={{display:"flex",alignItems:"center",gap:10,background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"10px 14px"}}>
          <span>🔍</span><input placeholder="Cari kursus..." value={search} onChange={e => setSearch(e.target.value)} style={{background:"none",border:"none",outline:"none",color:COLORS.text,fontSize:13,flex:1}} />
        </div>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 20px 16px",scrollbarWidth:"none"}}>
        {categories.map(c => <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{background:activeCategory===c.id?COLORS.accent:COLORS.card,border:`1px solid ${activeCategory===c.id?COLORS.accent:COLORS.border}`,borderRadius:24,padding:"7px 14px",color:activeCategory===c.id?"#FFF":COLORS.muted,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontWeight:600}}>{c.icon} {c.label}</button>)}
      </div>
      <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
        <p style={{fontSize:11,color:COLORS.muted,margin:0}}>{filtered.length} kursus ditemukan</p>
        {filtered.map(c => <CourseCard key={c.id} course={c} onClick={setSelectedCourse} />)}
      </div>
    </div>
  );
}

function JobsScreen() {
  const [activeCategory, setActiveCategory] = useState("all");
  const filtered = activeCategory === "all" ? jobs : jobs.filter(j => j.category === activeCategory);
  return (
    <div style={{padding:"16px 0 90px"}}>
      <div style={{padding:"0 20px 14px"}}><h2 style={{fontWeight:800,fontSize:22,color:COLORS.text,margin:"0 0 6px"}}>Lowongan Kerja</h2><p style={{color:COLORS.muted,fontSize:12,margin:0}}>Khusus lulusan kursus vokasi bersertifikat</p></div>
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 20px 16px",scrollbarWidth:"none"}}>
        {[{id:"all",label:"Semua",icon:"💼"},...categories.slice(1)].map(c => <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{background:activeCategory===c.id?COLORS.green:COLORS.card,border:`1px solid ${activeCategory===c.id?COLORS.green:COLORS.border}`,borderRadius:24,padding:"7px 14px",color:activeCategory===c.id?"#FFF":COLORS.muted,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontWeight:600}}>{c.icon} {c.label}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,padding:"0 20px"}}>
        {filtered.map(j => (
          <div key={j.id} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:16,padding:16,display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:52,height:52,borderRadius:14,background:COLORS.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{j.logo}</div>
            <div style={{flex:1}}><p style={{fontWeight:700,fontSize:14,color:COLORS.text,margin:"0 0 2px"}}>{j.title}</p><p style={{fontSize:11,color:COLORS.muted,margin:"0 0 8px"}}>{j.company} · {j.location}</p><div style={{display:"flex",gap:8}}><Badge text={j.salary} color={COLORS.green} /><Badge text={j.category} color={COLORS.accent} /></div></div>
            <button style={{background:COLORS.green,border:"none",borderRadius:10,color:"#FFF",padding:"8px 14px",fontSize:11,cursor:"pointer",fontWeight:700}}>Lamar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div style={{padding:"16px 0 90px"}}>
      <div style={{margin:"0 20px 20px",background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:20,padding:20,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",margin:"0 auto 12px",background:`linear-gradient(135deg,${COLORS.accent}44,${COLORS.accent}11)`,border:`2px solid ${COLORS.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>👨‍🔧</div>
        <h3 style={{fontWeight:800,fontSize:18,color:COLORS.text,margin:"0 0 4px"}}>{userStats.name}</h3>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:14}}><Badge text={`⚒️ ${userStats.rank}`} color={COLORS.gold} /></div>
        <div style={{display:"flex",justifyContent:"space-around"}}>
          {[{label:"Poin",value:userStats.points.toLocaleString('id-ID'),color:COLORS.gold},{label:"Sertifikat",value:userStats.certificates,color:COLORS.accent},{label:"Kursus",value:userStats.completedCourses,color:COLORS.green}].map((s,i) => <div key={i} style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:20,color:s.color}}>{s.value}</div><div style={{fontSize:10,color:COLORS.muted}}>{s.label}</div></div>)}
        </div>
      </div>
      <div style={{padding:"0 20px 20px"}}><h3 style={{fontWeight:700,fontSize:15,color:COLORS.text,margin:"0 0 12px"}}>🏆 Sertifikat</h3>
        {courses.filter(c => c.certified && c.progress > 0).slice(0,2).map(c => (
          <div key={c.id} style={{background:`linear-gradient(135deg,${c.color}22,${c.color}08)`,border:`1px solid ${c.color}44`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:12,background:c.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{c.emoji}</div>
            <div style={{flex:1}}><p style={{fontWeight:700,fontSize:12,color:COLORS.text,margin:"0 0 2px"}}>{c.title}</p><p style={{fontSize:10,color:COLORS.muted,margin:0}}>Sertifikat BNSP • 2025</p></div><span>📜</span>
          </div>
        ))}
      </div>
      <div style={{padding:"0 20px"}}><h3 style={{fontWeight:700,fontSize:15,color:COLORS.text,margin:"0 0 12px"}}>⭐ Pencapaian</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{icon:"🔧",label:"Mekanik Handal",desc:"3 kursus otomotif"},{icon:"⚡",label:"Belajar Kilat",desc:"7 hari streak"},{icon:"🏆",label:"Bersertifikat",desc:"2 sertifikat resmi"},{icon:"⭐",label:"Top 10%",desc:"Pelajar terbaik"}].map((a,i) => (
            <div key={i} style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:14}}><div style={{fontSize:28,marginBottom:6}}>{a.icon}</div><p style={{fontWeight:700,fontSize:12,color:COLORS.text,margin:"0 0 2px"}}>{a.label}</p><p style={{fontSize:10,color:COLORS.muted,margin:0}}>{a.desc}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourseDetailScreen({ course, onBack }) {
  const [playing, setPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const videos = (course.curriculum || []).slice(0,8).map((item,i) => ({...item,done:i<Math.floor(course.progress/15),locked:i>3&&course.progress<50}));

  return (
    <div style={{minHeight:"100vh",background:COLORS.bg,paddingBottom:40}}>
      <div style={{background:`linear-gradient(135deg,${course.color}33 0%,#000 100%)`,height:220,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <button onClick={onBack} style={{position:"absolute",top:16,left:16,background:"#00000066",border:"none",borderRadius:10,color:"#FFF",cursor:"pointer",padding:"6px 12px",fontSize:13}}>← Kembali</button>
        <div style={{textAlign:"center"}}><div style={{fontSize:64,marginBottom:8}}>{course.emoji}</div><button onClick={() => setPlaying(!playing)} style={{width:56,height:56,borderRadius:"50%",background:course.color,border:"none",cursor:"pointer",fontSize:20}}>{playing?"⏸":"▶"}</button></div>
        {course.certified && <div style={{position:"absolute",top:16,right:16,background:COLORS.gold+"22",color:COLORS.gold,border:`1px solid ${COLORS.gold}66`,borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:700}}>✦ BERSERTIFIKAT</div>}
      </div>
      <div style={{padding:"16px 20px 0"}}>
        <Badge text={course.level} color={course.color} />
        <h1 style={{fontWeight:800,fontSize:18,color:COLORS.text,margin:"8px 0 4px"}}>{course.title}</h1>
        <p style={{fontSize:12,color:COLORS.muted,margin:"0 0 12px"}}>oleh {course.instructor}</p>
        <div style={{display:"flex",gap:14,marginBottom:14}}><span style={{fontSize:11,color:COLORS.gold}}>★ {course.rating}</span><span style={{fontSize:11,color:COLORS.muted}}>👥 {course.students.toLocaleString('id-ID')}</span><span style={{fontSize:11,color:COLORS.muted}}>📹 {course.videos}</span><span style={{fontSize:11,color:COLORS.muted}}>⏱ {course.duration}</span></div>
        {course.progress > 0 && <div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:COLORS.muted}}>Progress</span><span style={{fontSize:11,color:course.color,fontWeight:700}}>{course.progress}%</span></div><div style={{height:6,background:COLORS.border,borderRadius:3}}><div style={{height:"100%",width:`${course.progress}%`,background:course.color,borderRadius:3}} /></div></div>}
        <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:`1px solid ${COLORS.border}`}}>
          {["overview","materi","instruktur"].map(t => <button key={t} onClick={() => setActiveTab(t)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 16px",color:activeTab===t?course.color:COLORS.muted,fontWeight:activeTab===t?700:400,fontSize:12,borderBottom:`2px solid ${activeTab===t?course.color:"transparent"}`,textTransform:"capitalize"}}>{t}</button>)}
        </div>
        {activeTab==="overview" && <div><p style={{fontSize:13,color:COLORS.text,lineHeight:1.6,marginBottom:16}}>{course.desc}</p><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{course.tags.map(tag => <Badge key={tag} text={tag} color={course.color} />)}</div></div>}
        {activeTab==="materi" && <div style={{display:"flex",flexDirection:"column",gap:8}}>{videos.map(v => <div key={v.id} style={{background:COLORS.card,border:`1px solid ${v.done?course.color+"44":COLORS.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,opacity:v.locked?0.5:1}}><div style={{width:32,height:32,borderRadius:8,background:v.done?course.color+"33":COLORS.surface,border:`1px solid ${v.done?course.color:COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{v.done?"✓":v.locked?"🔒":v.id}</div><div style={{flex:1}}><p style={{fontWeight:600,fontSize:12,color:COLORS.text,margin:0}}>{v.title}</p><p style={{fontSize:10,color:COLORS.muted,margin:0}}>{v.duration}</p></div></div>)}</div>}
        {activeTab==="instruktur" && <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:16}}><div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}><div style={{width:52,height:52,borderRadius:"50%",background:course.color+"33",border:`2px solid ${course.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>👨‍🏫</div><div><p style={{fontWeight:700,fontSize:14,color:COLORS.text,margin:"0 0 2px"}}>{course.instructor}</p><Badge text="Instruktur Terverifikasi" color={COLORS.green} /></div></div><p style={{fontSize:12,color:COLORS.muted,lineHeight:1.6,margin:0}}>Praktisi profesional dengan pengalaman lebih dari 10 tahun di industri.</p></div>}
        <button style={{width:"100%",background:course.color,border:"none",borderRadius:14,padding:14,marginTop:20,color:"#FFF",fontWeight:800,fontSize:15,cursor:"pointer"}}>{course.progress>0?`▶ Lanjutkan — ${course.progress}%`:"Mulai Belajar Gratis"}</button>
      </div>
    </div>
  );
}

export default function MaestroVokasi() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCourse, setSelectedCourse] = useState(null);

  if (selectedCourse) {
    return (
      <div style={{background:COLORS.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto"}}>
        <CourseDetailScreen course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      </div>
    );
  }

  return (
    <div style={{background:COLORS.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative",color:COLORS.text}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:COLORS.bg+"DD",backdropFilter:"blur(16px)",borderBottom:`1px solid ${COLORS.border}`,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${COLORS.accent},#FF3D00)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚒️</div>
          <span style={{fontWeight:800,fontSize:16,color:COLORS.text}}>Maestro</span><span style={{fontWeight:800,fontSize:16,color:COLORS.accent}}>Vokasi</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{background:COLORS.accentGlow,border:`1px solid ${COLORS.accent}44`,borderRadius:10,padding:"5px 10px",fontSize:11,fontWeight:700,color:COLORS.accent}}>🔥 {userStats.streak} hari</div>
          <div style={{background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:10,padding:"5px 10px",fontSize:11,fontWeight:700,color:COLORS.gold}}>✦ {userStats.points.toLocaleString('id-ID')}</div>
        </div>
      </div>
      {activeTab==="home" && <HomeScreen setActiveTab={setActiveTab} setSelectedCourse={setSelectedCourse} />}
      {activeTab==="courses" && <CoursesScreen setSelectedCourse={setSelectedCourse} />}
      {activeTab==="jobs" && <JobsScreen />}
      {activeTab==="profile" && <ProfileScreen />}
      <BottomNav active={activeTab} setActive={setActiveTab} />
    </div>
  );
}
