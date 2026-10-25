import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  Calendar,
  CalendarClock,
  Wallet,
  Receipt,
  Settings,
  LogOut,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ChevronRight,
  X,
  Download,
  Check,
  Menu,
  BookOpen,
  Clock,
  AlertCircle,
  Printer,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Contact,
  Tags,
  School,
  Trash2,
  Pencil,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  Bell,
  Send,
  Palette,
  ScrollText,
} from "lucide-react";
import { api, today, currentMonth, exportCSV } from "./api";
import "./styles.css";
const labels = {
  present: "Présent",
  absent: "Absent",
  late: "Retard",
  excused: "Excusé",
  paid: "Réglée",
  partial: "Partielle",
  pending: "À régler",
  overdue: "En retard",
  cash: "Espèces",
  transfer: "Virement",
  card: "Carte",
  cheque: "Chèque",
};
const dateFR = (v) =>
  v ? new Date(v.slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR") : "—";
const periodFR = (v) =>
  new Date(v + "-01T12:00:00").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
function Badge({ value, children }) {
  return (
    <span className={"badge " + value}>
      {children || labels[value] || value}
    </span>
  );
}
function Button({ children, icon: Icon, secondary = false, ...props }) {
  return (
    <button className={secondary ? "button secondary" : "button"} {...props}>
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}
function Field({ label, children, ...props }) {
  return (
    <label className={"field " + (props.wide ? "wide" : "")}>
      {label}
      {(children
        ? React.cloneElement(children, { "aria-label": label })
        : null) || (
        <input
          {...Object.fromEntries(
            Object.entries(props).filter(([k]) => k !== "wide"),
          )}
        />
      )}
    </label>
  );
}
function Empty({ text = "Aucun résultat.", children }) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <strong>{text}</strong>
      {children}
    </div>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const el = document.activeElement;
    setTimeout(
      () =>
        document
          .querySelector(".modal input,.modal select,.modal button")
          ?.focus(),
      0,
    );
    return () => {
      document.removeEventListener("keydown", handler);
      el?.focus?.();
    };
  }, []);
  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "modal-wide" : "")}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
function Form({ onSubmit, children, submit = "Enregistrer", onCancel }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          await onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">{children}</div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <footer>
        {onCancel && (
          <Button type="button" secondary onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button disabled={busy} type="submit">
          {busy ? "Enregistrement…" : submit}
        </Button>
      </footer>
    </form>
  );
}
function useData(path, version) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setError("");
    api(path)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [path, version]);
  return [data, error];
}
function Load({ data, error, children }) {
  if (error)
    return (
      <div className="error" role="alert">
        {error}
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <RefreshCw size={20} /> Chargement…
      </div>
    );
  return children;
}
function Table({ headers, children }) {
  const rows = React.Children.map(children, (row) => {
    if (!React.isValidElement(row)) return row;
    const cells = React.Children.map(row.props.children, (cell, index) => {
      if (!React.isValidElement(cell)) return cell;
      return React.cloneElement(cell, {
        "data-label": headers[index] ?? cell.props["data-label"],
      });
    });
    return React.cloneElement(row, null, cells);
  });
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
function Person({ name, sub }) {
  return (
    <div className="person">
      <span className="avatar">
        {name
          .split(" ")
          .slice(0, 2)
          .map((x) => x[0])
          .join("")}
      </span>
      <div>
        <strong>{name}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}
const pages = {
  dashboard: "/vue-densemble",
  students: "/eleves",
  teachers: "/formateurs",
  specialties: "/specialites",
  levels: "/niveaux",
  groups: "/groupes",
  calendar: "/calendrier",
  attendance: "/presences",
  billing: "/mensualites",
  branding: "/apparence",
  logs: "/journaux",
  settings: "/parametres",
};
const pageTitles = {
  dashboard: "Vue d’ensemble",
  students: "Élèves",
  teachers: "Formateurs",
  specialties: "Spécialités",
  levels: "Niveaux scolaires",
  groups: "Groupes & inscriptions",
  calendar: "Calendrier",
  attendance: "Présences",
  billing: "Mensualités",
  branding: "Apparence",
  logs: "Journal",
  settings: "Paramètres",
};
function studentIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/eleves\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
function groupIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/presences\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
function studyGroupIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/groupes\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
function billingGroupIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/mensualites\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
function knownPath(pathname) {
  return (
    pathname === "/" ||
    Object.values(pages).includes(pathname) ||
    studentIdFromPath(pathname) != null ||
    studyGroupIdFromPath(pathname) != null ||
    groupIdFromPath(pathname) != null ||
    billingGroupIdFromPath(pathname) != null
  );
}
function readPageFrom(pathname) {
  if (studentIdFromPath(pathname) != null) return "students";
  if (studyGroupIdFromPath(pathname) != null) return "groups";
  if (groupIdFromPath(pathname) != null) return "attendance";
  if (billingGroupIdFromPath(pathname) != null) return "billing";
  const match = Object.entries(pages).find(([, path]) => path === pathname);
  return match ? match[0] : "dashboard";
}
function manages(user) {
  return user?.role === "admin" || user?.role === "superadmin";
}
function actionLabel(action) {
  const known = {
    "auth.login": "Connexion",
    "auth.logout": "Déconnexion",
    "auth.password": "Mot de passe modifié",
    "branding.update": "Apparence",
    "student.whatsapp": "Message de bienvenue",
    "session.makeup": "Rattrapage",
    "attendance.saved": "Appel enregistré",
    "invoices.generated": "Mensualités générées",
    "enrollment.closed": "Inscription clôturée",
    "payment.created": "Paiement enregistré",
    "invoice.remind": "Rappel WhatsApp",
    "payment.whatsapp": "Reçu WhatsApp",
  };
  if (known[action]) return known[action];
  const resources = [
    ["/whatsapp/logout", "WhatsApp"],
    ["/students", "élève"],
    ["/teachers", "formateur"],
    ["/specialties", "spécialité"],
    ["/levels", "niveau"],
    ["/groups", "groupe"],
    ["/enrollments", "inscription"],
    ["/sessions", "séance"],
    ["/invoices", "mensualité"],
    ["/payments", "paiement"],
    ["/users", "compte"],
    ["/settings", "paramètres"],
    ["/makeups", "rattrapage"],
  ];
  const verbs = {
    POST: "Création",
    PUT: "Modification",
    PATCH: "Modification",
    DELETE: "Suppression",
  };
  const [method, path] = String(action || "").split(" ");
  const resource = resources.find(([prefix]) => path?.startsWith(prefix));
  if (verbs[method] && resource) return verbs[method] + " · " + resource[1];
  return action;
}
function roleLabel(role) {
  if (role === "superadmin") return "Super administrateur";
  if (role === "admin") return "Administrateur";
  return "Gestionnaire";
}
function readPage() {
  return readPageFrom(location.pathname);
}
function App() {
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(true),
    [page, setPageState] = useState(readPage),
    [path, setPath] = useState(() => location.pathname),
    [version, setVersion] = useState(0),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [settings, setSettings] = useState({ name: "CentreFlow", currency: "MAD" }),
    [brand, setBrand] = useState(null);
  const go = (nextPath) => {
    if (location.pathname !== nextPath) history.pushState(null, "", nextPath);
    setPath(nextPath);
    setPageState(readPageFrom(nextPath));
  };
  const setPage = (key) => go(pages[key] || pages.dashboard);
  useEffect(() => {
    if (!user) return;
    if (page === "logs" && !manages(user)) go(pages.dashboard);
    if (page === "branding" && user.role !== "superadmin") go(pages.dashboard);
  }, [page, user]);
  useEffect(() => {
    if (location.pathname === "/") {
      history.replaceState(null, "", pages.dashboard);
      setPath(pages.dashboard);
    } else if (!knownPath(location.pathname)) {
      history.replaceState(null, "", pages.dashboard);
      setPath(pages.dashboard);
      setPageState("dashboard");
    }
    const sync = () => {
      setPath(location.pathname);
      setPageState(readPage());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const centre = settings.name || "CentreFlow";
    document.title = (pageTitles[page] || centre) + " · " + centre;
  }, [page, settings.name]);
  useEffect(() => {
    fetch("/api/branding")
      .then((response) => response.json())
      .then(setBrand)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const source = settings.color ? settings : brand;
    if (!source?.color) return;
    document.documentElement.style.setProperty("--green", source.color);
    document.documentElement.style.setProperty("--dark", source.color_dark || "#123b3a");
  }, [settings, brand]);
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setBoot(false));
    const expire = () => {
      setUser(null);
      setToast("Votre session a expiré.");
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (user)
      api("/settings")
        .then(setSettings)
        .catch((e) => setToast(e.message));
  }, [user, version]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const refresh = (message = "Modifications enregistrées.") => {
    setVersion((v) => v + 1);
    setToast(message);
  };
  const money = (v) =>
    new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: settings.currency,
    }).format(Number(v || 0));
  const nav = [
    ["dashboard", "Vue d’ensemble", LayoutDashboard],
    ["students", "Élèves", Users],
    ["teachers", "Formateurs", Contact],
    ["specialties", "Spécialités", Tags],
    ["levels", "Niveaux scolaires", School],
    ["groups", "Groupes & inscriptions", Layers],
    ["calendar", "Calendrier", Calendar],
    ["attendance", "Présences", CalendarCheck],
    ["billing", "Mensualités", Wallet],
    ...(user?.role === "superadmin" ? [["branding", "Apparence", Palette]] : []),
    ...(manages(user) ? [["logs", "Journal", ScrollText]] : []),
    ["settings", "Paramètres", Settings],
  ];
  if (boot)
    return (
      <div className="boot">
        CentreFlow<span>Préparation de votre espace…</span>
      </div>
    );
  if (!user)
    return (
      <>
        <Login
          brand={brand}
          onLogin={(u) => {
            setUser(u);
            setPageState(readPage());
            setPath(location.pathname);
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  const shared = { version, refresh, money, user, settings };
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href={pages.dashboard} onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            setPage("dashboard");
          }}>
          {settings.logo ? (
            <img className="brand-logo" src={settings.logo} alt="" />
          ) : (
            <span className="brand-icon">
              <GraduationCap size={25} />
            </span>
          )}
          <span className="brand-name">{settings.name}</span>
        </a>
        <p className="nav-caption">VOTRE CENTRE, ORGANISÉ</p>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <a
              key={key}
              href={pages[key]}
              className={page === key ? "active" : ""}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                setPage(key);
                setMenu(false);
              }}
            >
              <Icon size={19} />
              {label}
              {page === key && <ChevronRight className="nav-arrow" size={16} />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <span>Tout commence par un bon suivi.</span>
            <p>
              Moins d’administration.
              <br />
              Plus de transmission.
            </p>
          </div>
          <div className="user">
            <span className="avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleLabel(user.role)}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Déconnexion"
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  setUser(null);
                } catch (e) {
                  setToast(e.message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menu && <div className="sidebar-shade" onClick={() => setMenu(false)} />}
      <main>
        <div className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
          >
            <Menu />
          </button>
          <div>
            <span className="breadcrumb">Espace de gestion</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n[0] === page)?.[1] || pageTitles[page]}</strong>
          </div>
          <span className="top-date">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <div className="content">
          {page === "dashboard" && <Dashboard {...shared} navigate={setPage} />}
          {page === "students" && <Students {...shared} path={path} go={go} />}
          {page === "teachers" && <Teachers {...shared} />}
          {page === "specialties" && <Specialties {...shared} />}
          {page === "levels" && <SchoolLevels {...shared} />}
          {page === "groups" && <Groups {...shared} path={path} go={go} />}
          {page === "calendar" && <CalendarPage {...shared} go={go} />}
          {page === "attendance" && <Attendance {...shared} path={path} go={go} />}
          {page === "billing" && <Billing {...shared} path={path} go={go} />}
          {page === "branding" && user.role === "superadmin" && (
            <BrandStudio {...shared} />
          )}
          {page === "logs" && manages(user) && <LogsPage version={version} />}
          {page === "settings" && <SettingsPage {...shared} />}
        </div>
        <div className="main-footer">
          CentreFlow{" "}
          <span>Un centre bien géré. Des élèves bien accompagnés.</span>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Login({ onLogin, brand }) {
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          {brand?.logo ? (
            <img className="brand-logo" src={brand.logo} alt="" />
          ) : (
            <span className="brand-icon">
              <GraduationCap />
            </span>
          )}
          <span className="brand-name">{brand?.name || "CentreFlow"}</span>
        </div>
        <div>
          <span className="eyebrow">L’ESPRIT LIBRE POUR ENSEIGNER</span>
          <h1>
            Votre centre.
            <br />
            Votre équipe.
            <br />
            <em>Un seul espace.</em>
          </h1>
          <p>
            Élèves, présences et mensualités :<br />
            retrouvez l’essentiel, simplement.
          </p>
          <div className="story-symbol">
            <GraduationCap size={110} />
            <span />
            <span />
          </div>
        </div>
        <small>Gestion de centres de soutien & de formation</small>
      </div>
      <section className="login-card">
        <span className="eyebrow">BIENVENUE SUR CENTREFLOW</span>
        <h2>Heureux de vous retrouver.</h2>
        <p>Connectez-vous à votre espace de gestion.</p>
        <Form
          submit="Se connecter"
          onSubmit={async (b) =>
            onLogin(await api("/auth/login", { method: "POST", body: b }))
          }
        >
          <Field
            wide
            label="Adresse e-mail"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <Field
            wide
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Form>
        <div className="login-note">
          <ShieldCheck size={17} /> Accès réservé à l’équipe du centre.
        </div>
      </section>
    </div>
  );
}
function Heading({ eyebrow, title, description, children }) {
  return (
    <div className="heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Dashboard({ version, money, navigate }) {
  const [period, setPeriod] = useState(currentMonth()),
    [d, error] = useData("/dashboard?period=" + period, version);
  const total = d?.attendance.reduce((a, x) => a + x.n, 0) || 0,
    present =
      d?.attendance
        .filter((x) => x.status === "present" || x.status === "late")
        .reduce((a, x) => a + x.n, 0) || 0;
  return (
    <>
      <Heading
        eyebrow="TABLEAU DE BORD"
        title="Une vue claire sur votre centre."
        description="L’essentiel de votre activité, au même endroit."
      >
        <input
          aria-label="Mois du tableau de bord"
          type="month"
          value={period}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}
        />
      </Heading>
      <Load data={d} error={error}>
        {d && (
          <>
            <div className="hero-banner">
              <div>
                <span className="banner-tag">
                  <span /> VOTRE CENTRE EN MOUVEMENT
                </span>
                <h2>
                  Plus de temps pour
                  <br />
                  faire progresser vos élèves.
                </h2>
                <p>Suivez les présences et gardez vos mensualités à jour.</p>
                <button onClick={() => navigate("attendance")}>
                  Faire l’appel <ArrowRight size={17} />
                </button>
              </div>
              <div className="banner-art">
                <div className="art-orbit" />
                <div className="art-card">
                  <CalendarCheck size={35} />
                  <span>Chaque séance compte.</span>
                  <strong>
                    {total ? Math.round((present / total) * 100) + " %" : "—"}
                  </strong>
                  <small>de présence sur les appels saisis</small>
                </div>
                <span className="art-spark">✦</span>
              </div>
            </div>
            <div className="stats three">
              <Stat
                label="Élèves actifs"
                value={d.students}
                icon={Users}
                sub="Effectif de votre centre"
              />
              <Stat
                label="Groupes actifs"
                value={d.groups}
                icon={Layers}
                sub="Apprentissage en mouvement"
              />
              <Stat
                label="Encaissements du mois"
                value={money(d.collected)}
                icon={Wallet}
                sub={periodFR(period)}
              />
            </div>
            <div className="stats three">
              <Stat
                label="Facturé sur le mois"
                value={money(d.billed)}
                icon={Receipt}
                sub={periodFR(period)}
              />
              <Stat
                label="Réglé sur ces mensualités"
                value={money(d.invoicePaid)}
                icon={Wallet}
                sub={periodFR(period)}
              />
              <Stat
                label="Reste à encaisser"
                value={money(d.outstanding)}
                icon={AlertCircle}
                sub="Mensualités du mois sélectionné"
                orange
              />
            </div>
            <div className="stats three">
              <Stat
                label="En retard"
                value={d.late}
                icon={Bell}
                sub={periodFR(period)}
                orange
              />
              <Stat
                label="À venir"
                value={d.coming}
                icon={Clock}
                sub={periodFR(period)}
              />
              <Stat
                label="Réglées"
                value={d.settled}
                icon={Check}
                sub={periodFR(period)}
              />
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Derniers encaissements</h2>
                    <p>Les derniers paiements enregistrés</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("billing")}
                  >
                    Voir tout <ArrowUpRight size={16} />
                  </button>
                </div>
                {d.recent.length ? (
                  <Table headers={["Élève", "Date", "Montant"]}>
                    {d.recent.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Person
                            name={p.student_name}
                            sub={"Reçu RC-" + String(p.id).padStart(6, "0")}
                          />
                        </td>
                        <td>{dateFR(p.paid_on)}</td>
                        <td className="amount">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <Empty text="Pas encore d’encaissement." />
                )}
              </section>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Prochaines séances</h2>
                    <p>Votre calendrier en un coup d’œil</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("calendar")}
                  >
                    Voir le calendrier <ArrowUpRight size={16} />
                  </button>
                </div>
                {d.upcoming.length ? (
                  <div className="session-list">
                    {d.upcoming.map((s) => (
                      <div key={s.id}>
                        <span className="date-tile">
                          <strong>{s.date.slice(8)}</strong>
                          {new Date(s.date + "T12:00:00").toLocaleDateString(
                            "fr-FR",
                            { month: "short" },
                          )}
                        </span>
                        <div>
                          <strong>{s.group_name}</strong>
                          <small>
                            {s.start_time.slice(0, 5)} –{" "}
                            {s.end_time.slice(0, 5)}
                          </small>
                        </div>
                        <ChevronRight size={16} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="Votre calendrier est libre.">
                    <button
                      className="text-button"
                      onClick={() => navigate("attendance")}
                    >
                      Planifier une séance
                    </button>
                  </Empty>
                )}
              </section>
            </div>
          </>
        )}
      </Load>
    </>
  );
}
function Stat({ label, value, sub, icon: Icon, orange, onClick, selected }) {
  const className =
    "stat" + (orange ? " stat-orange" : "") + (selected ? " is-on" : "");
  const body = (
    <>
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={className} onClick={onClick} aria-pressed={!!selected}>
      {body}
    </button>
  );
}
function SearchBox({ value, onChange, placeholder = "Rechercher…" }) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function foldText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
function ComboField({
  name,
  required = false,
  placeholder,
  options,
  defaultValue = "",
  onSelect,
  ...rest
}) {
  const match = options.find((option) => String(option.value) === String(defaultValue));
  const [query, setQuery] = useState(match?.label || "");
  const [value, setValue] = useState(match ? String(match.value) : "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const root = useRef(null);
  const inputRef = useRef(null);
  const synced = useRef(Boolean(match));
  const selected = options.find((option) => String(option.value) === value);
  const filtering = query.trim() && query !== selected?.label;
  const shown = filtering
    ? options.filter((option) => foldText(option.label).includes(foldText(query.trim())))
    : options;
  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (synced.current || defaultValue === "" || defaultValue == null) return;
    const found = options.find((option) => String(option.value) === String(defaultValue));
    if (!found) return;
    synced.current = true;
    setQuery(found.label);
    setValue(String(found.value));
  }, [options, defaultValue]);
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !value ? "Choisissez une valeur dans la liste." : "",
    );
  }, [required, value]);
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);
  function choose(option) {
    setQuery(option.label);
    setValue(String(option.value));
    setOpen(false);
    onSelect?.(String(option.value));
  }
  return (
    <div className="combo" ref={root}>
      <Search size={15} />
      <input
        {...rest}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setValue("");
          setOpen(true);
          onSelect?.("");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && shown[highlight]) {
            event.preventDefault();
            choose(shown[highlight]);
          } else if (event.key === "Escape") setOpen(false);
        }}
      />
      <input type="hidden" name={name} value={value} />
      {open && (
        <ul className="combo-list" role="listbox">
          {shown.length ? (
            shown.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(option.value) === value}
                  className={index === highlight ? "is-active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option)}
                >
                  {option.label}
                </button>
              </li>
            ))
          ) : (
            <li className="combo-empty">Aucun résultat</li>
          )}
        </ul>
      )}
    </div>
  );
}
function echeanceDate(day) {
  const period = currentMonth();
  const [year, monthNumber] = period.split("-").map(Number);
  const last = new Date(year, monthNumber, 0).getDate();
  const chosen = Math.min(Math.max(Number(day) || 1, 1), last);
  return period + "-" + String(chosen).padStart(2, "0");
}
function StudentEditor({ value, levels, dueDay, onClose, onSaved }) {
  return (
    <Modal
      title={value.id ? "Modifier l’élève" : "Nouvel élève"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        onSubmit={async (b) => {
          await api("/students" + (value.id ? "/" + value.id : ""), {
            method: value.id ? "PUT" : "POST",
            body: { ...b, active: b.active === "true" },
          });
          onSaved();
        }}
      >
        <Field
          label="Prénom *"
          name="first_name"
          required
          maxLength={80}
          defaultValue={value.first_name}
        />
        <Field
          label="Nom *"
          name="last_name"
          required
          maxLength={80}
          defaultValue={value.last_name}
        />
        <Field
          label="Téléphone"
          name="phone"
          maxLength={30}
          defaultValue={value.phone}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          defaultValue={value.email}
        />
        <Field wide label="Niveau scolaire">
          <ComboField
            name="level_id"
            placeholder="Rechercher un niveau"
            defaultValue={value.level_id || ""}
            options={(levels || []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Field>
        <Field label="Statut">
          <select
            name="active"
            defaultValue={value.active === 0 ? "false" : "true"}
          >
            <option value="true">Actif</option>
            <option value="false">Archivé</option>
          </select>
        </Field>
        <Field
          wide
          label="Date d’échéance *"
          name="due_date"
          type="date"
          required
          defaultValue={echeanceDate(value.due_day || dueDay)}
        />
        <Field wide label="Notes">
          <textarea name="notes" maxLength={2000} defaultValue={value.notes} />
        </Field>
        <p className="form-hint wide">
          La date proposée reprend le jour d’échéance des Paramètres. Le jour
          choisi s’applique à chaque mensualité de cet élève. Le niveau se
          choisit dans la page Niveaux scolaires.
        </p>
      </Form>
    </Modal>
  );
}
function enrollmentState(enrollment, day) {
  if (enrollment.end_date && enrollment.end_date < day) return "closed";
  if (enrollment.start_date > day) return "upcoming";
  return "open";
}
function groupPayment(enrollment, bills, day, money) {
  const mine = bills.filter(
    (invoice) => Number(invoice.enrollment_id) === Number(enrollment.id),
  );
  let focus = String(day).slice(0, 7);
  if (enrollment.start_date > day) focus = String(enrollment.start_date).slice(0, 7);
  else if (enrollment.end_date && String(enrollment.end_date).slice(0, 7) < focus)
    focus = String(enrollment.end_date).slice(0, 7);
  const invoice = mine.find((item) => item.period === focus);
  const monthName = periodFR(focus);
  if (!invoice)
    return {
      tone: "unpaid",
      label: "Non payé",
      detail: monthName + " n’est pas payé. La mensualité n’a pas encore été générée.",
    };
  if (invoice.status === "paid")
    return { tone: "paid", label: "Payé", detail: monthName + " est réglé." };
  if (invoice.status === "partial")
    return {
      tone: "partial",
      label: "Partiel",
      detail: "Reste " + money(invoice.balance) + " pour " + monthName + ".",
    };
  if (invoice.status === "overdue")
    return {
      tone: "unpaid",
      label: "Non payé",
      detail:
        money(invoice.balance) +
        " en retard, échéance le " +
        dateFR(invoice.due_date) +
        ".",
    };
  return {
    tone: "unpaid",
    label: "Non payé",
    detail:
      money(invoice.balance) +
      " à payer avant le " +
      dateFR(invoice.due_date) +
      ".",
  };
}
function shortTime(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${Number(match[1])}h${match[2]}` : "";
}
function scheduleLines(schedule) {
  return String(schedule || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}
function sendStudentWelcome(studentId) {
  return api("/students/" + studentId + "/whatsapp", {
    method: "POST",
    body: {},
  });
}
function StudentFile({ id, version, money, onBack, onEdit, onSent, centre }) {
  const [file, error] = useData("/students/" + id, version),
    [receipt, setReceipt] = useState(null),
    [sendError, setSendError] = useState(""),
    [sending, setSending] = useState(false);
  const student = file?.student;
  useEffect(() => {
    if (!student) return undefined;
    document.title =
      student.first_name + " " + student.last_name + " · " + (centre || "CentreFlow");
    return () => {
      document.title = "Élèves · " + (centre || "CentreFlow");
    };
  }, [student, centre]);
  if (error)
    return (
      <>
        <Heading
          eyebrow="ÉLÈVE"
          title="Fiche indisponible."
          description={error}
        >
          <Button secondary icon={ArrowLeft} onClick={onBack}>
            Retour
          </Button>
        </Heading>
      </>
    );
  if (!file)
    return (
      <div className="loading">
        <RefreshCw size={20} /> Chargement…
      </div>
    );
  const day = today();
  const rank = { open: 0, upcoming: 1, closed: 2 };
  const memberships = [...file.enrollments].sort(
    (a, b) =>
      rank[enrollmentState(a, day)] - rank[enrollmentState(b, day)] ||
      a.group_name.localeCompare(b.group_name, "fr"),
  );
  const openMemberships = memberships.filter(
    (enrollment) => enrollmentState(enrollment, day) !== "closed",
  );
  const upcoming = openMemberships.filter(
    (enrollment) => enrollmentState(enrollment, day) === "upcoming",
  );
  const monthlyTotal = openMemberships.reduce(
    (sum, enrollment) => sum + Number(enrollment.monthly_fee || 0),
    0,
  );
  const bills = file.invoices;
  const receipts = file.payments;
  const attendance = file.attendance;
  const paidTotal = bills.reduce((sum, invoice) => sum + Number(invoice.paid || 0), 0);
  const balance = bills.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const nextDue = bills
    .filter((invoice) => Number(invoice.balance) > 0)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const mark of attendance) counts[mark.status] = (counts[mark.status] || 0) + 1;
  const name = student.first_name + " " + student.last_name;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("");
  const nextStart = [...upcoming].sort((a, b) =>
    String(a.start_date).localeCompare(String(b.start_date)),
  )[0];
  let brief = "Cet élève n’est inscrit dans aucun groupe.";
  if (!student.active)
    brief =
      "Cet élève est archivé. Ses groupes, ses paiements et ses présences restent consultables.";
  else if (balance > 0)
    brief =
      "Il reste " +
      money(balance) +
      " à encaisser" +
      (nextDue
        ? ", échéance le " +
          dateFR(nextDue.due_date) +
          " pour " +
          periodFR(nextDue.period) +
          "."
        : ".") +
      " Le règlement se fait dans Mensualités.";
  else if (openMemberships.length) {
    const current = openMemberships.length - upcoming.length;
    const parts = [];
    if (current)
      parts.push(
        current +
          (current > 1 ? " groupes en cours" : " groupe en cours") +
          ", " +
          money(monthlyTotal) +
          " par mois.",
      );
    if (nextStart)
      parts.push(
        nextStart.group_name + " commence le " + dateFR(nextStart.start_date) + ".",
      );
    const unpaid = openMemberships
      .map((enrollment) => groupPayment(enrollment, bills, day, money))
      .filter((payment) => payment.tone !== "paid");
    parts.push(
      unpaid.length
        ? unpaid.map((payment) => payment.detail).join(" ")
        : "Les mois suivis sont payés.",
    );
    brief = parts.join(" ");
  }
  return (
    <>
      <section className="student-hero">
        <div>
          <div className="student-identity">
            <span className="avatar">{initials}</span>
            <div>
              <span className="eyebrow">
                {"EL-" + String(student.id).padStart(4, "0")}
              </span>
              <h1>{name}</h1>
              <div className="student-tags">
                <Badge value={student.active ? "present" : "excused"}>
                  {student.active ? "Actif" : "Archivé"}
                </Badge>
                <span>{student.level || "Niveau non renseigné"}</span>
              </div>
            </div>
          </div>
          <div className="student-contacts">
            {student.phone ? (
              <a href={"tel:" + student.phone}>
                <Phone size={15} />
                {student.phone}
              </a>
            ) : (
              <span>Téléphone non renseigné</span>
            )}
            {student.email ? (
              <a href={"mailto:" + student.email}>
                <Mail size={15} />
                {student.email}
              </a>
            ) : (
              <span>E-mail non renseigné</span>
            )}
            <span>Au centre depuis le {dateFR(student.created_at)}</span>
          </div>
        </div>
        <div className="heading-actions">
          <Button secondary icon={ArrowLeft} onClick={onBack}>
            Retour
          </Button>
          <Button
            secondary
            icon={MessageCircle}
            disabled={sending}
            onClick={async () => {
              setSendError("");
              setSending(true);
              try {
                await sendStudentWelcome(id);
                onSent("Message envoyé à " + student.first_name + ".");
              } catch (error) {
                setSendError(error.message);
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? "Envoi…" : "Envoyer sur WhatsApp"}
          </Button>
          <Button icon={Pencil} onClick={() => onEdit(student)}>
            Modifier
          </Button>
        </div>
      </section>
      {sendError && (
        <div className="error" role="alert">
          {sendError}
        </div>
      )}
      
      <div className="stats">
        <Stat
          label="Groupes suivis"
          value={openMemberships.length}
          icon={Layers}
          sub={
            upcoming.length
              ? upcoming.length + " à venir"
              : memberships.length - openMemberships.length
                ? memberships.length -
                  openMemberships.length +
                  " terminée" +
                  (memberships.length - openMemberships.length > 1 ? "s" : "")
                : "Inscriptions ouvertes"
          }
        />
        <Stat
          label="À payer chaque mois"
          value={money(monthlyTotal)}
          icon={Wallet}
          sub="Somme des tarifs des inscriptions ouvertes"
        />
        <Stat
          label="Déjà encaissé"
          value={money(paidTotal)}
          icon={Receipt}
          sub="Total des mensualités réglées"
        />
        <Stat
          label="Reste à encaisser"
          value={money(balance)}
          icon={AlertCircle}
          sub={balance > 0 ? "Solde encore dû" : "Aucun solde en attente"}
          orange={balance > 0}
        />
      </div>
      <div className="student-page">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Notes</h2>
              <p>Ce qu’il faut savoir sur cet élève.</p>
            </div>
          </div>
          <p className="student-notes">
            {student.notes?.trim() ? student.notes : "Aucune note pour le moment."}
          </p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Groupes</h2>
              <p>Matière, enseignant, salle, horaires et tarif de chaque inscription.</p>
            </div>
          </div>
          {memberships.length ? (
            <div className="student-groups">
              {memberships.map((enrollment) => {
                const state = enrollmentState(enrollment, day);
                const lines = scheduleLines(enrollment.schedule);
                const payment = groupPayment(enrollment, bills, day, money);
                return (
                  <article
                    key={enrollment.id}
                    className={
                      "student-group" + (state === "closed" ? " is-closed" : "")
                    }
                  >
                    <div className="student-group-top">
                      <span className="eyebrow">{enrollment.subject || "Spécialité à définir"}</span>
                      <span className="student-group-badges">
                        <Badge
                          value={
                            state === "closed"
                              ? "excused"
                              : state === "upcoming"
                                ? "pending"
                                : "present"
                          }
                        >
                          {state === "closed"
                            ? "Terminée"
                            : state === "upcoming"
                              ? "À venir"
                              : "En cours"}
                        </Badge>
                        <Badge
                          value={
                            payment.tone === "paid"
                              ? "paid"
                              : payment.tone === "partial"
                                ? "partial"
                                : "overdue"
                          }
                        >
                          {payment.label}
                        </Badge>
                      </span>
                    </div>
                    <h3>{enrollment.group_name}</h3>
                    <ul>
                      <li>
                        <BookOpen size={15} />
                        {enrollment.teacher
                          ? "Enseignant : " + enrollment.teacher
                          : "Enseignant à définir"}
                        {enrollment.group_active ? "" : " · groupe archivé"}
                      </li>
                      <li>
                        <Layers size={15} />
                        {enrollment.room
                          ? /salle/i.test(enrollment.room)
                            ? enrollment.room
                            : "Salle " + enrollment.room
                          : "Salle à définir"}
                      </li>
                      {(lines.length ? lines : ["Horaires à définir"]).map((line) => (
                        <li key={line}>
                          <Clock size={15} />
                          {line}
                        </li>
                      ))}
                      <li>
                        <Wallet size={15} />
                        {money(enrollment.monthly_fee)} / mois
                      </li>
                    </ul>
                    <p>
                      {state === "closed"
                        ? "Du " +
                          dateFR(enrollment.start_date) +
                          " au " +
                          dateFR(enrollment.end_date)
                        : state === "upcoming"
                          ? "Commence le " + dateFR(enrollment.start_date)
                          : "Depuis le " + dateFR(enrollment.start_date)}
                    </p>
                    <p className={"student-pay is-" + payment.tone}>{payment.detail}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty text="Aucun groupe pour cet élève.">
              <span>L’inscription se fait dans Groupes & inscriptions.</span>
            </Empty>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Mensualités</h2>
              <p>Facture, solde et reçu de chaque mois.</p>
            </div>
          </div>
          {bills.length ? (
            <Table
              headers={["Mois", "Groupe", "Échéance", "Montant", "Réglé", "Solde", "Statut", "Reçu"]}
            >
              {bills.map((invoice) => {
                const paid = receipts.filter(
                  (payment) => Number(payment.invoice_id) === Number(invoice.id),
                );
                return (
                  <tr key={invoice.id}>
                    <td>{periodFR(invoice.period)}</td>
                    <td>{invoice.group_name}</td>
                    <td>{dateFR(invoice.due_date)}</td>
                    <td>{money(invoice.amount)}</td>
                    <td>{money(invoice.paid)}</td>
                    <td className="amount">{money(invoice.balance)}</td>
                    <td>
                      <Badge value={invoice.status} />
                    </td>
                    <td>
                      {paid.length
                        ? paid.map((payment) => (
                            <div key={payment.id}>
                              RC-{String(payment.id).padStart(6, "0")}
                              <small>
                                {dateFR(payment.paid_on)} ·{" "}
                                {labels[payment.method] || payment.method}
                              </small>
                              <button
                                className="text-button"
                                onClick={() => setReceipt(payment.id)}
                              >
                                <Printer size={16} /> Imprimer
                              </button>
                            </div>
                          ))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty text="Aucune mensualité pour cet élève.">
              <span>
                Elles apparaissent après la génération du mois, dans Mensualités.
                Le mois d’entrée est facturé en entier.
              </span>
            </Empty>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Présences</h2>
              <p>L’appel de chaque séance suivie par cet élève.</p>
            </div>
          </div>
          <div className="attendance-counts">
            {["present", "absent", "late", "excused"].map((status) => (
              <span key={status}>
                <strong>{counts[status]}</strong>
                <small>{labels[status]}</small>
              </span>
            ))}
          </div>
          {attendance.length ? (
            <Table headers={["Date", "Horaire", "Groupe", "Séance", "Statut", "Note"]}>
              {attendance.map((mark, index) => (
                <tr key={mark.date + mark.start_time + mark.group_name + index}>
                  <td>{dateFR(mark.date)}</td>
                  <td>
                    {shortTime(mark.start_time)}–{shortTime(mark.end_time)}
                  </td>
                  <td>{mark.group_name}</td>
                  <td>{mark.topic || "—"}</td>
                  <td>
                    <Badge value={mark.status} />
                  </td>
                  <td>{mark.note || "—"}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="Aucune présence enregistrée.">
              <span>L’appel se fait dans Présences, séance par séance.</span>
            </Empty>
          )}
        </section>
      </div>
      {receipt && (
        <ReceiptModal id={receipt} onClose={() => setReceipt(null)} />
      )}
    </>
  );
}
function Students({ version, refresh, money, path, go, settings }) {
  const [rows, error] = useData("/students", version),
    [levels] = useData("/levels", version),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("active"),
    [edit, setEdit] = useState(null),
    [sendError, setSendError] = useState(""),
    [sendingId, setSendingId] = useState(0);
  const viewId = studentIdFromPath(path);
  if (viewId)
    return (
      <>
        <StudentFile
          id={viewId}
          version={version}
          money={money}
          onBack={() => go(pages.students)}
          onEdit={setEdit}
          onSent={refresh}
          centre={settings?.name}
        />
        {edit && (
          <StudentEditor
            value={edit}
            levels={levels || []}
            dueDay={settings?.due_day}
            onClose={() => setEdit(null)}
            onSaved={() => {
              setEdit(null);
              refresh();
            }}
          />
        )}
      </>
    );
  const filtered = rows?.filter(
    (s) =>
      (filter === "all" || Boolean(s.active) === (filter === "active")) &&
      `${s.first_name} ${s.last_name} ${s.phone} ${s.level}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="EFFECTIFS"
        title="Chaque élève a sa place."
        description="Centralisez les coordonnées et les informations de vos élèves."
      >
        <Button icon={Plus} onClick={() => setEdit({})}>
          Nouvel élève
        </Button>
      </Heading>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Nom, téléphone, niveau…"
          />
          <select
            aria-label="Statut des élèves"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="active">Élèves actifs</option>
            <option value="inactive">Élèves archivés</option>
            <option value="all">Tous les élèves</option>
          </select>
          <Button
            secondary
            icon={Download}
            onClick={() =>
              exportCSV(
                "eleves.csv",
                filtered?.map((s) => ({
                  Prénom: s.first_name,
                  Nom: s.last_name,
                  Téléphone: s.phone,
                  Email: s.email,
                  Niveau: s.level,
                  Actif: s.active ? "Oui" : "Non",
                })) || [],
              )
            }
          >
            Exporter
          </Button>
        </div>
        {sendError && (
          <div className="error" role="alert">
            {sendError}
          </div>
        )}
        <Load data={rows} error={error}>
          {filtered?.length ? (
            <Table
              headers={[
                "Élève",
                "Contact",
                "Niveau",
                "Groupes actuels",
                "Statut",
                "Actions",
              ]}
            >
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Person
                      name={s.first_name + " " + s.last_name}
                      sub={"EL-" + String(s.id).padStart(4, "0")}
                    />
                  </td>
                  <td>
                    {s.phone || "—"}
                    <small>{s.email}</small>
                  </td>
                  <td>{s.level || "—"}</td>
                  <td>{s.group_count}</td>
                  <td>
                    <Badge value={s.active ? "present" : "excused"}>
                      {s.active ? "Actif" : "Archivé"}
                    </Badge>
                  </td>
                  <td>
                    <a
                      className="icon-button"
                      href={"/eleves/" + s.id}
                      aria-label={"Voir " + s.first_name + " " + s.last_name}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        go("/eleves/" + s.id);
                      }}
                    >
                      <Eye size={17} />
                    </a>
                    <button
                      className="icon-button"
                      aria-label={"Envoyer sur WhatsApp à " + s.first_name}
                      disabled={sendingId === s.id}
                      onClick={async () => {
                        setSendError("");
                        setSendingId(s.id);
                        try {
                          await sendStudentWelcome(s.id);
                          refresh("Message envoyé à " + s.first_name + ".");
                        } catch (sendFailure) {
                          setSendError(sendFailure.message);
                        } finally {
                          setSendingId(0);
                        }
                      }}
                    >
                      <MessageCircle size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + s.first_name}
                      onClick={() => setEdit(s)}
                    >
                      <Pencil size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="Aucun élève trouvé." />
          )}
        </Load>
      </section>
      {edit && (
        <StudentEditor
          value={edit}
          levels={levels || []}
          dueDay={settings?.due_day}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
const WEEK_DAYS = [
  { id: "lun", short: "Lun", full: "Lundi" },
  { id: "mar", short: "Mar", full: "Mardi" },
  { id: "mer", short: "Mer", full: "Mercredi" },
  { id: "jeu", short: "Jeu", full: "Jeudi" },
  { id: "ven", short: "Ven", full: "Vendredi" },
  { id: "sam", short: "Sam", full: "Samedi" },
  { id: "dim", short: "Dim", full: "Dimanche" },
];
const DAY_INDEX = Object.fromEntries(WEEK_DAYS.map((day, index) => [day.id, index]));
const DAY_ALIAS = {
  lundi: "lun",
  lun: "lun",
  mardi: "mar",
  mar: "mar",
  mercredi: "mer",
  mer: "mer",
  jeudi: "jeu",
  jeu: "jeu",
  vendredi: "ven",
  ven: "ven",
  samedi: "sam",
  sam: "sam",
  dimanche: "dim",
  dim: "dim",
};
const CAL_START = 8 * 60;
const CAL_END = 24 * 60;
function minutesOf(value) {
  const [hour, minute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}
function clockOf(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function formatClock(value) {
  const minutes = minutesOf(value);
  if (minutes == null) return "";
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
function joinDayNames(days) {
  const names = [...days]
    .sort((a, b) => DAY_INDEX[a] - DAY_INDEX[b])
    .map((id) => WEEK_DAYS.find((day) => day.id === id)?.full.toLocaleLowerCase("fr"))
    .filter(Boolean);
  if (!names.length) return "";
  names[0] = names[0].charAt(0).toLocaleUpperCase("fr") + names[0].slice(1);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}
function formatSlot(slot) {
  return `${joinDayNames(slot.days)} · ${formatClock(slot.start)}–${formatClock(slot.end)}`;
}
function formatSchedule(slots) {
  return slots.map(formatSlot).join(" | ");
}
function parseClock(raw) {
  const match = String(raw || "")
    .trim()
    .match(/^(\d{1,2})(?:h|:)(\d{2})?$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour > 23 || minute > 59) return null;
  return clockOf(hour * 60 + minute);
}
function parseSchedule(value) {
  const source = String(value || "").trim();
  if (!source) return { slots: [], unparsed: "" };
  const slots = [];
  for (const part of source.split(/\s*\|\s*/)) {
    const pieces = part.split(/\s*[·•]\s*/);
    if (pieces.length < 2) return { slots: [], unparsed: source };
    const times = pieces[pieces.length - 1].split(/\s*[–—-]\s*/);
    if (times.length !== 2) return { slots: [], unparsed: source };
    const start = parseClock(times[0]);
    const end = parseClock(times[1]);
    if (!start || !end || start >= end) return { slots: [], unparsed: source };
    const days = [];
    for (const word of pieces
      .slice(0, -1)
      .join(" ")
      .split(/\s*(?:,|&|et)\s*/i)) {
      const id = DAY_ALIAS[word.trim().toLowerCase()];
      if (!id) return { slots: [], unparsed: source };
      if (!days.includes(id)) days.push(id);
    }
    if (!days.length) return { slots: [], unparsed: source };
    slots.push({ days, start, end });
  }
  return { slots, unparsed: "" };
}
function validRange(start, end) {
  const from = minutesOf(start);
  const to = minutesOf(end);
  return from != null && to != null && from < to;
}
function daysFromSlots(slots) {
  const days = {};
  for (const slot of slots)
    for (const day of slot.days) days[day] = { start: slot.start, end: slot.end };
  return days;
}
function slotsFromDays(days) {
  const groups = new Map();
  for (const day of WEEK_DAYS) {
    const hours = days[day.id];
    if (!hours || !validRange(hours.start, hours.end)) continue;
    const key = `${hours.start}|${hours.end}`;
    if (!groups.has(key))
      groups.set(key, { days: [], start: hours.start, end: hours.end });
    groups.get(key).days.push(day.id);
  }
  return [...groups.values()];
}
function blockStyle(start, end) {
  const from = minutesOf(start);
  const to = minutesOf(end);
  if (from == null || to == null || to <= from) return null;
  const span = CAL_END - CAL_START;
  const top = Math.max(0, ((from - CAL_START) / span) * 100);
  const bottom = Math.min(100, ((to - CAL_START) / span) * 100);
  return { top: `${top}%`, height: `${Math.max(bottom - top, 3)}%` };
}
function minutesFromPointer(clientY, rect) {
  const ratio = rect.height ? (clientY - rect.top) / rect.height : 0;
  const raw = CAL_START + Math.min(1, Math.max(0, ratio)) * (CAL_END - CAL_START);
  return Math.min(23 * 60 + 30, Math.max(CAL_START, Math.round(raw / 30) * 30));
}
function rangeFromDrag(anchor, pointer) {
  let start = Math.min(anchor, pointer);
  let end = Math.max(anchor, pointer);
  if (end - start < 30) end = Math.min(23 * 60 + 30, start + 60);
  if (end - start < 30) start = Math.max(CAL_START, end - 60);
  return { start: clockOf(start), end: clockOf(end) };
}
function SchedulePicker({ defaultValue = "", labelId }) {
  const initial = parseSchedule(defaultValue);
  const initialDays = daysFromSlots(initial.slots);
  const firstDay = WEEK_DAYS.find((day) => initialDays[day.id])?.id || null;
  const [days, setDays] = useState(initialDays);
  const [active, setActive] = useState(null);
  const [start, setStart] = useState(firstDay ? initialDays[firstDay].start : "18:00");
  const [end, setEnd] = useState(firstDay ? initialDays[firstDay].end : "19:30");
  const dragRef = useRef(null);
  const inputRef = useRef(null);
  const summary = formatSchedule(slotsFromDays(days));
  const invalid = active && days[active] && !validRange(start, end);
  const value = summary || (!Object.keys(days).length ? initial.unparsed : "");
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      invalid
        ? "L'heure de fin doit être après l'heure de début."
        : value.length > 255
          ? "L'horaire dépasse 255 caractères."
          : "",
    );
  }, [invalid, value]);
  function applyHours(id, nextStart, nextEnd) {
    setStart(nextStart);
    setEnd(nextEnd);
    setActive(id);
    if (!validRange(nextStart, nextEnd)) return;
    setDays((current) => ({
      ...current,
      [id]: { start: nextStart, end: nextEnd },
    }));
  }
  function selectDay(id) {
    const existing = days[id];
    if (existing) {
      setStart(existing.start);
      setEnd(existing.end);
      setActive(id);
      return;
    }
    if (!validRange(start, end)) return;
    setDays((current) => ({ ...current, [id]: { start, end } }));
    setActive(id);
  }
  function clearDay(id) {
    setDays((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (active === id) setActive(null);
  }
  function changeHours(nextStart, nextEnd) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (!active) return;
    setDays((current) =>
      current[active]
        ? { ...current, [active]: { start: nextStart, end: nextEnd } }
        : current,
    );
  }
  function onPointerDown(event, id) {
    if (event.button !== 0) return;
    const track = event.currentTarget.querySelector(".schedule-track");
    dragRef.current = {
      id,
      anchor: minutesFromPointer(event.clientY, track.getBoundingClientRect()),
      moved: false,
      originY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.abs(event.clientY - drag.originY) < 5) return;
    drag.moved = true;
    const track = event.currentTarget.querySelector(".schedule-track");
    const range = rangeFromDrag(
      drag.anchor,
      minutesFromPointer(event.clientY, track.getBoundingClientRect()),
    );
    applyHours(drag.id, range.start, range.end);
  }
  function onPointerUp(event, id) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.button !== 0 || drag?.moved) return;
    selectDay(id);
  }
  return (
    <div className="schedule-picker" role="group" aria-labelledby={labelId}>
      <div className="schedule-week">
        <div className="schedule-axis" aria-hidden="true">
          {[8, 12, 16, 20].map((hour) => (
            <span
              key={hour}
              style={{ top: `${((hour * 60 - CAL_START) / (CAL_END - CAL_START)) * 100}%` }}
            >
              {hour}h
            </span>
          ))}
        </div>
        <div className="schedule-days">
          {WEEK_DAYS.map((day) => {
            const hours = days[day.id];
            const selected = active === day.id;
            const hoursValid = hours && validRange(hours.start, hours.end);
            return (
              <button
                key={day.id}
                type="button"
                className={
                  "schedule-day" +
                  (hoursValid ? " is-on" : "") +
                  (selected ? " is-draft" : "") +
                  (hours && !hoursValid ? " is-invalid" : "")
                }
                aria-pressed={selected}
                aria-label={
                  hours
                    ? `${day.full}, ${formatClock(hours.start)}–${formatClock(hours.end)}`
                    : day.full
                }
                onPointerDown={(event) => onPointerDown(event, day.id)}
                onPointerMove={onPointerMove}
                onPointerUp={(event) => onPointerUp(event, day.id)}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
              >
                <span className="schedule-head">{day.short}</span>
                <span className="schedule-track">
                  {hoursValid && (
                    <span
                      className="schedule-block"
                      style={blockStyle(hours.start, hours.end)}
                    />
                  )}
                </span>
                <span className="schedule-hours">
                  {hours ? (
                    <>
                      {formatClock(hours.start)}
                      <br />
                      {formatClock(hours.end)}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="schedule-times">
        <label>
          Début
          <input
            type="time"
            step="1800"
            value={start}
            onChange={(event) => changeHours(event.target.value, end)}
          />
        </label>
        <label>
          Fin
          <input
            type="time"
            step="1800"
            value={end}
            onChange={(event) => changeHours(start, event.target.value)}
          />
        </label>
        <button
          type="button"
          className="schedule-add"
          disabled={!active || !days[active]}
          onClick={() => clearDay(active)}
        >
          Effacer{" "}
          {WEEK_DAYS.find((day) => day.id === active)?.full.toLocaleLowerCase(
            "fr",
          ) || "le jour"}
        </button>
      </div>
      <p className={"schedule-summary" + (summary || initial.unparsed ? "" : " is-empty")}>
        {summary ||
          (!Object.keys(days).length && initial.unparsed
            ? initial.unparsed
            : "Aucun horaire sélectionné")}
      </p>
      {invalid && (
        <p className="schedule-error" role="alert">
          L’heure de fin ({formatClock(end)}) doit être après l’heure de début
          ({formatClock(start)}).
        </p>
      )}
      {!summary && initial.unparsed && (
        <p className="schedule-hint">
          Ce texte sera remplacé dès que vous choisissez un jour dans le
          calendrier.
        </p>
      )}
      <p className="schedule-hint">
        Cliquez un jour pour lui donner l’horaire affiché. « Effacer » retire
        l’horaire du jour sélectionné.
      </p>
      <input ref={inputRef} type="hidden" name="schedule" value={value} />
    </div>
  );
}
function GroupStudents({ group, enrollments, money, onBack, onEnroll, onEnd }) {
  const day = today();
  const freePlaces = Math.max(0, group.capacity - enrollments.length);
  const monthlyTotal = enrollments.reduce(
    (sum, enrollment) => sum + Number(enrollment.monthly_fee || 0),
    0,
  );
  const rows = [...enrollments].sort((a, b) =>
    a.student_name.localeCompare(b.student_name, "fr"),
  );
  return (
    <>
      <Heading
        eyebrow={group.subject || "Spécialité à définir"}
        title="Élèves inscrits"
        description={
          group.name + (group.teacher ? " · " + group.teacher : "")
        }
      >
        <Button secondary icon={ArrowLeft} onClick={onBack}>
          Retour
        </Button>
        <Button icon={UserPlus} onClick={onEnroll}>
          Inscrire un élève
        </Button>
      </Heading>
      <div className="group-page-stats">
        <span>
          <strong>
            {enrollments.length} / {group.capacity}
          </strong>
          <small>élèves inscrits</small>
        </span>
        <span>
          <strong>{freePlaces}</strong>
          <small>places libres</small>
        </span>
        <span>
          <strong>{money(monthlyTotal)}</strong>
          <small>total / mois</small>
        </span>
        <span>
          <strong>{money(group.monthly_fee)}</strong>
          <small>tarif du groupe</small>
        </span>
      </div>
      <section className="panel">
        {rows.length ? (
          <Table
            headers={["Élève", "Période", "Tarif / mois", "Statut", "Action"]}
          >
            {rows.map((enrollment) => (
              <tr key={enrollment.id}>
                <td>
                  <Person name={enrollment.student_name} />
                </td>
                <td>
                  {dateFR(enrollment.start_date)}
                  <small>
                    {enrollment.start_date > day
                      ? "Dès le " + dateFR(enrollment.start_date)
                      : "Depuis le " + dateFR(enrollment.start_date)}
                  </small>
                </td>
                <td className="amount">{money(enrollment.monthly_fee)}</td>
                <td>
                  <Badge
                    value={enrollment.start_date > day ? "pending" : "present"}
                  >
                    {enrollment.start_date > day ? "À venir" : "Inscrit"}
                  </Badge>
                </td>
                <td>
                  <Button
                    secondary
                    icon={UserMinus}
                    onClick={() => onEnd(enrollment)}
                  >
                    Clôturer
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty text="Aucun élève inscrit dans ce groupe." />
        )}
      </section>
    </>
  );
}
function SchoolLevels({ version, refresh }) {
  const [rows, error] = useData("/levels", version),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState(null),
    [removing, setRemoving] = useState(null);
  const filtered = rows?.filter((item) =>
    `${item.name} ${item.group_names || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="PARCOURS"
        title="Les niveaux scolaires."
        description="Créez, modifiez ou supprimez les niveaux affectés aux élèves et aux groupes."
      >
        <Button icon={Plus} onClick={() => setEdit({})}>
          Nouveau niveau
        </Button>
      </Heading>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un niveau…"
          />
        </div>
        <Load data={rows} error={error}>
          {filtered?.length ? (
            <Table headers={["Niveau", "Groupes", "Actions"]}>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.group_count}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + item.name}
                      onClick={() => setEdit(item)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Supprimer " + item.name}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="Aucun niveau scolaire.">
              <button className="text-button" onClick={() => setEdit({})}>
                Nouveau niveau
              </button>
            </Empty>
          )}
        </Load>
      </section>
      {edit && (
        <LevelEditor
          value={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
      {removing && (
        <Modal title="Supprimer le niveau" onClose={() => setRemoving(null)}>
          <Form
            submit="Supprimer"
            onCancel={() => setRemoving(null)}
            onSubmit={async () => {
              await api("/levels/" + removing.id, { method: "DELETE" });
              setRemoving(null);
              refresh("Niveau supprimé.");
            }}
          >
            <p className="form-hint wide">
              « {removing.name} » sera retiré des élèves et des groupes qui
              l’utilisent.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function LevelEditor({ value, onClose, onSaved }) {
  return (
    <Modal
      title={value.id ? "Modifier le niveau" : "Nouveau niveau"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        onSubmit={async (b) => {
          await api("/levels" + (value.id ? "/" + value.id : ""), {
            method: value.id ? "PUT" : "POST",
            body: b,
          });
          onSaved();
        }}
      >
        <Field
          wide
          label="Nom *"
          name="name"
          required
          maxLength={100}
          defaultValue={value.name}
        />
      </Form>
    </Modal>
  );
}
function teacherName(teacher) {
  return `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim();
}
function Specialties({ version, refresh }) {
  const [rows, error] = useData("/specialties", version),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState(null),
    [removing, setRemoving] = useState(null);
  const filtered = rows?.filter((item) =>
    `${item.name} ${item.teacher_names || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="PARCOURS"
        title="Les spécialités du centre."
        description="Créez, modifiez ou supprimez les spécialités affectées aux formateurs."
      >
        <Button icon={Plus} onClick={() => setEdit({})}>
          Nouvelle spécialité
        </Button>
      </Heading>
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Rechercher une spécialité…"
          />
        </div>
        <Load data={rows} error={error}>
          {filtered?.length ? (
            <Table headers={["Spécialité", "Formateurs", "Actions"]}>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    {item.teacher_count}
                    <small>{item.teacher_names || "Aucun formateur"}</small>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + item.name}
                      onClick={() => setEdit(item)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Supprimer " + item.name}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="Aucune spécialité.">
              <button className="text-button" onClick={() => setEdit({})}>
                Nouvelle spécialité
              </button>
            </Empty>
          )}
        </Load>
      </section>
      {edit && (
        <SpecialtyEditor
          value={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
      {removing && (
        <Modal title="Supprimer la spécialité" onClose={() => setRemoving(null)}>
          <Form
            submit="Supprimer"
            onCancel={() => setRemoving(null)}
            onSubmit={async () => {
              await api("/specialties/" + removing.id, { method: "DELETE" });
              setRemoving(null);
              refresh("Spécialité supprimée.");
            }}
          >
            <p className="form-hint wide">
              « {removing.name} » sera retirée. Les formateurs qui l’utilisent
              n’auront plus de spécialité.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Teachers({ version, refresh }) {
  const [rows, error] = useData("/teachers", version),
    [specialties] = useData("/specialties", version),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("active"),
    [edit, setEdit] = useState(null);
  const filtered = rows?.filter(
    (teacher) =>
      (filter === "all" || Boolean(teacher.active) === (filter === "active")) &&
      `${teacherName(teacher)} ${teacher.phone} ${teacher.email} ${teacher.specialty} ${teacher.group_names || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="ÉQUIPE"
        title="Les formateurs du centre."
        description="Créez les enseignants, puis affectez-les à leurs groupes."
      >
        <Button icon={Plus} onClick={() => setEdit({})}>
          Nouveau formateur
        </Button>
      </Heading>
      <section className="panel">
          <div className="toolbar">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Nom, téléphone, spécialité…"
            />
            <select
              aria-label="Statut des formateurs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="active">Formateurs actifs</option>
              <option value="inactive">Formateurs archivés</option>
              <option value="all">Tous les formateurs</option>
            </select>
            <Button
              secondary
              icon={Download}
              onClick={() =>
                exportCSV(
                  "formateurs.csv",
                  filtered?.map((teacher) => ({
                    Prénom: teacher.first_name,
                    Nom: teacher.last_name,
                    Téléphone: teacher.phone,
                    Email: teacher.email,
                    Spécialité: teacher.specialty,
                    Groupes: teacher.group_names || "",
                    Actif: teacher.active ? "Oui" : "Non",
                  })) || [],
                )
              }
            >
              Exporter
            </Button>
          </div>
          <Load data={rows} error={error}>
            {filtered?.length ? (
              <Table
                headers={[
                  "Formateur",
                  "Contact",
                  "Spécialité",
                  "Groupes",
                  "Statut",
                  "Actions",
                ]}
              >
                {filtered.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <Person
                        name={teacherName(teacher)}
                        sub={"FO-" + String(teacher.id).padStart(4, "0")}
                      />
                    </td>
                    <td>
                      {teacher.phone || "—"}
                      <small>{teacher.email}</small>
                    </td>
                    <td>{teacher.specialty || "—"}</td>
                    <td>
                      {teacher.group_count}
                      <small>{teacher.group_names || "Aucun groupe"}</small>
                    </td>
                    <td>
                      <Badge value={teacher.active ? "present" : "excused"}>
                        {teacher.active ? "Actif" : "Archivé"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={"Modifier " + teacherName(teacher)}
                        onClick={() => setEdit(teacher)}
                      >
                        <Pencil size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <Empty text="Aucun formateur trouvé.">
                <button className="text-button" onClick={() => setEdit({})}>
                  Nouveau formateur
                </button>
              </Empty>
            )}
          </Load>
        </section>
      {edit && (
        <TeacherEditor
          value={edit}
          specialties={specialties || []}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
function SpecialtyEditor({ value, onClose, onSaved }) {
  return (
    <Modal
      title={value.id ? "Modifier la spécialité" : "Nouvelle spécialité"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        onSubmit={async (b) => {
          await api("/specialties" + (value.id ? "/" + value.id : ""), {
            method: value.id ? "PUT" : "POST",
            body: b,
          });
          onSaved();
        }}
      >
        <Field
          wide
          label="Nom *"
          name="name"
          required
          maxLength={100}
          defaultValue={value.name}
        />
      </Form>
    </Modal>
  );
}
function TeacherEditor({ value, specialties, onClose, onSaved }) {
  return (
    <Modal
      title={value.id ? "Modifier le formateur" : "Nouveau formateur"}
      onClose={onClose}
    >
      <Form
        onCancel={onClose}
        onSubmit={async (b) => {
          await api("/teachers" + (value.id ? "/" + value.id : ""), {
            method: value.id ? "PUT" : "POST",
            body: { ...b, active: b.active === "true" },
          });
          onSaved();
        }}
      >
        <Field
          label="Prénom *"
          name="first_name"
          required
          maxLength={80}
          defaultValue={value.first_name}
        />
        <Field
          label="Nom"
          name="last_name"
          maxLength={80}
          defaultValue={value.last_name}
        />
        <Field
          label="Téléphone"
          name="phone"
          maxLength={30}
          defaultValue={value.phone}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          defaultValue={value.email}
        />
        <Field wide label="Spécialité">
          <ComboField
            name="specialty_id"
            placeholder="Rechercher une spécialité"
            defaultValue={value.specialty_id || ""}
            options={specialties.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Field>
        <Field label="Statut">
          <select
            name="active"
            defaultValue={value.active === 0 ? "false" : "true"}
          >
            <option value="true">Actif</option>
            <option value="false">Archivé</option>
          </select>
        </Field>
        <Field wide label="Notes">
          <textarea name="notes" maxLength={2000} defaultValue={value.notes} />
        </Field>
        <p className="form-hint wide">
          Choisissez une spécialité depuis la page Spécialités. Le nom du formateur
          s’affiche sur chaque groupe auquel il est affecté.
        </p>
      </Form>
    </Modal>
  );
}
function Groups({ version, refresh, money, path, go }) {
  const [groups, error] = useData("/groups", version),
    [students] = useData("/students", version),
    [teachers] = useData("/teachers", version),
    [levels] = useData("/levels", version),
    [enrollments] = useData("/enrollments", version),
    [edit, setEdit] = useState(null),
    [enroll, setEnroll] = useState(false),
    [ending, setEnding] = useState(null),
    [tab, setTab] = useState("groups");
  const viewId = studyGroupIdFromPath(path);
  const day = today();
  const openEnrollments = (groupId) =>
    (enrollments || []).filter(
      (enrollment) =>
        Number(enrollment.group_id) === Number(groupId) &&
        (!enrollment.end_date || enrollment.end_date >= day),
    );
  const viewed = groups?.find((group) => group.id === viewId) || null;
  return (
    <>
      {!viewId && (
        <>
      <Heading
        eyebrow="ORGANISATION"
        title="Des groupes bien organisés."
        description="Gérez les parcours, les tarifs et les inscriptions."
      >
        <Button secondary icon={UserPlus} onClick={() => setEnroll(true)}>
          Inscrire un élève
        </Button>
        <Button icon={Plus} onClick={() => setEdit({})}>
          Nouveau groupe
        </Button>
      </Heading>
      <div className="tabs">
        <button
          className={tab === "groups" ? "selected" : ""}
          onClick={() => setTab("groups")}
        >
          Groupes <span>{groups?.length || 0}</span>
        </button>
        <button
          className={tab === "enrollments" ? "selected" : ""}
          onClick={() => setTab("enrollments")}
        >
          Inscriptions <span>{enrollments?.length || 0}</span>
        </button>
      </div>
        </>
      )}
      <Load data={groups} error={error}>
        {viewId && !viewed ? (
          <Heading
            eyebrow="GROUPES"
            title="Groupe introuvable."
            description="Ce groupe n’existe pas ou a été retiré."
          >
            <Button secondary icon={ArrowLeft} onClick={() => go(pages.groups)}>
              Retour
            </Button>
          </Heading>
        ) : viewed ? (
          <GroupStudents
            group={viewed}
            enrollments={openEnrollments(viewId)}
            money={money}
            onBack={() => go(pages.groups)}
            onEnroll={() => setEnroll(viewed)}
            onEnd={setEnding}
          />
        ) : tab === "groups" ? (
          groups?.length ? (
            <div className="group-grid">
              {groups.map((g) => {
                const open = openEnrollments(g.id);
                const monthlyTotal = open.reduce(
                  (sum, enrollment) => sum + Number(enrollment.monthly_fee || 0),
                  0,
                );
                const freePlaces = Math.max(0, g.capacity - open.length);
                return (
                <section key={g.id} className="group-card">
                  <div className="group-card-top">
                    <span className="subject-icon">
                      <BookOpen size={22} />
                    </span>
                    <Badge value={g.active ? "present" : "excused"}>
                      {g.active ? "Actif" : "Archivé"}
                    </Badge>
                    <button
                      className="icon-button"
                      aria-label={"Voir les élèves de " + g.name}
                      onClick={() => go(pages.groups + "/" + g.id)}
                    >
                      <Eye size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + g.name}
                      onClick={() => setEdit(g)}
                    >
                      <Pencil size={17} />
                    </button>
                  </div>
                  <span className="eyebrow">{g.subject || "Spécialité à définir"}</span>
                  <h2>{g.name}</h2>
                  <p>{g.teacher || "Enseignant à définir"}</p>
                  <div className="group-meta">
                    <span>
                      <School size={15} />
                      {g.level || "Niveau à définir"}
                    </span>
                    <span>
                      <Clock size={15} />
                      {g.schedule || "Horaires à définir"}
                    </span>
                    <span>
                      <Layers size={15} />
                      {g.room || "Salle à définir"}
                    </span>
                  </div>
                  <div className="capacity">
                    <div>
                      <span>
                        {open.length} / {g.capacity} élèves inscrits
                      </span>
                      <strong>
                        {money(g.monthly_fee)}
                        <small> / mois</small>
                      </strong>
                    </div>
                    <progress value={open.length} max={g.capacity} />
                  </div>
                  <div className="group-stats">
                    <span>
                      <strong>{freePlaces}</strong>
                      <small>places libres</small>
                    </span>
                    <span>
                      <strong>{money(monthlyTotal)}</strong>
                      <small>total inscrits / mois</small>
                    </span>
                  </div>
                  <button className="text-button" onClick={() => setEnroll(g)}>
                    Inscrire un élève <ArrowRight size={16} />
                  </button>
                </section>
                );
              })}
            </div>
          ) : (
            <section className="panel">
              <Empty text="Créez votre premier groupe." />
            </section>
          )
        ) : (
          <section className="panel">
            {enrollments?.length ? (
              <Table
                headers={[
                  "Élève",
                  "Groupe",
                  "Période",
                  "Tarif / mois",
                  "Statut",
                  "Action",
                ]}
              >
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Person name={e.student_name} />
                    </td>
                    <td>{e.group_name}</td>
                    <td>
                      {dateFR(e.start_date)}
                      <small>
                        {e.end_date
                          ? "Fin : " + dateFR(e.end_date)
                          : "Sans date de fin"}
                      </small>
                    </td>
                    <td className="amount">{money(e.monthly_fee)}</td>
                    <td>
                      <Badge value={e.end_date ? "excused" : "present"}>
                        {e.end_date ? "Fin définie" : "Ouverte"}
                      </Badge>
                    </td>
                    <td>
                      {!e.end_date && (
                        <Button
                          secondary
                          icon={UserMinus}
                          onClick={() => setEnding(e)}
                        >
                          Clôturer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <Empty text="Aucune inscription." />
            )}
          </section>
        )}
      </Load>
      {edit && (
        <Modal
          title={edit.id ? "Modifier le groupe" : "Nouveau groupe"}
          onClose={() => setEdit(null)}
        >
          <Form
            onCancel={() => setEdit(null)}
            onSubmit={async (b) => {
              await api("/groups" + (edit.id ? "/" + edit.id : ""), {
                method: edit.id ? "PUT" : "POST",
                body: { ...b, active: b.active === "true" },
              });
              setEdit(null);
              refresh();
            }}
          >
            <Field
              label="Nom du groupe *"
              name="name"
              required
              maxLength={120}
              defaultValue={edit.name}
            />
            <Field wide label="Enseignant">
              <ComboField
                name="teacher_id"
                placeholder="Rechercher un formateur"
                defaultValue={edit.teacher_id || ""}
                options={(teachers || [])
                  .filter(
                    (teacher) =>
                      teacher.active ||
                      Number(teacher.id) === Number(edit.teacher_id),
                  )
                  .map((teacher) => ({
                    value: teacher.id,
                    label:
                      teacherName(teacher) +
                      (teacher.specialty ? " · " + teacher.specialty : "") +
                      (teacher.active ? "" : " · Archivé"),
                  }))}
              />
            </Field>
            <p className="form-hint wide">
              La matière du groupe est la spécialité du formateur choisi. La
              liste se gère dans Formateurs.
            </p>
            <Field wide label="Niveau scolaire">
              <ComboField
                name="level_id"
                placeholder="Rechercher un niveau"
                defaultValue={edit.level_id || ""}
                options={(levels || []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Field>
            <p className="form-hint wide">
              Les niveaux se créent et se modifient dans la page Niveaux scolaires.
            </p>
            <Field
              label="Salle"
              name="room"
              maxLength={80}
              defaultValue={edit.room}
            />
            <div className="field wide">
              <span id="group-schedule-label">Horaires habituels</span>
              <SchedulePicker
                labelId="group-schedule-label"
                defaultValue={edit.schedule || ""}
              />
            </div>
            <Field
              label="Mensualité *"
              name="monthly_fee"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              defaultValue={edit.monthly_fee ?? 300}
            />
            <Field
              label="Capacité *"
              name="capacity"
              type="number"
              min="1"
              max="1000"
              required
              defaultValue={edit.capacity ?? 20}
            />
            <Field label="Statut">
              <select
                name="active"
                defaultValue={edit.active === 0 ? "false" : "true"}
              >
                <option value="true">Actif</option>
                <option value="false">Archivé</option>
              </select>
            </Field>
            <p className="form-hint wide">
              Le tarif du groupe s’applique aux nouvelles inscriptions. Les
              inscriptions existantes conservent leur tarif. L’archivage ne les
              clôture pas.
            </p>
          </Form>
        </Modal>
      )}
      {enroll && (
        <Modal title="Inscrire un élève" onClose={() => setEnroll(false)}>
          <Form
            onCancel={() => setEnroll(false)}
            onSubmit={async (b) => {
              const group = groups?.find((item) => item.id === Number(b.group_id));
              if (!group) throw new Error("Choisissez un groupe.");
              const created = await api("/enrollments", {
                method: "POST",
                body: { ...b, monthly_fee: group.monthly_fee },
              });
              setEnroll(false);
              refresh(
                created.invoices
                  ? "Élève inscrit. " +
                    created.invoices +
                    " mensualité(s) ajoutée(s)."
                  : "Élève inscrit.",
              );
            }}
          >
            <Field wide label="Élève *">
              <ComboField
                name="student_id"
                required
                placeholder="Rechercher un élève"
                options={(students || [])
                  .filter((student) => student.active)
                  .map((student) => ({
                    value: student.id,
                    label: `${student.first_name} ${student.last_name}`,
                  }))}
              />
            </Field>
            <Field wide label="Groupe *">
              <ComboField
                name="group_id"
                required
                placeholder="Rechercher un groupe"
                defaultValue={enroll.id || ""}
                options={(groups || [])
                  .filter((group) => group.active)
                  .map((group) => ({
                    value: group.id,
                    label: `${group.name} · ${money(group.monthly_fee)}`,
                  }))}
              />
            </Field>
            <Field
              wide
              label="Date de début *"
              name="start_date"
              type="date"
              required
              defaultValue={today()}
            />
            <p className="form-hint wide">
              Le tarif du groupe est appliqué à cette inscription. Le mois
              d’entrée est facturé en entier, sans prorata. Si les mensualités
              du groupe sont déjà générées pour un mois couvert, elles sont
              ajoutées à l’élève.
            </p>
          </Form>
        </Modal>
      )}
      {ending && (
        <Modal title="Clôturer l’inscription" onClose={() => setEnding(null)}>
          <p>
            {ending.student_name} · {ending.group_name}
          </p>
          <Form
            onCancel={() => setEnding(null)}
            onSubmit={async (b) => {
              await api("/enrollments/" + ending.id + "/end", {
                method: "PATCH",
                body: b,
              });
              setEnding(null);
              refresh();
            }}
          >
            <Field
              wide
              label="Dernier jour d’inscription inclus *"
              type="date"
              name="end_date"
              min={ending.start_date}
              defaultValue={today()}
              required
            />
            <p className="form-hint wide">
              Les mensualités existantes sont conservées. Les mois après la fin
              ne seront plus générés. Cette clôture est définitive dans cette
              version.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
const JS_DAY = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const SEANCE_LABEL = {
  ended: "Terminée",
  live: "En cours",
  coming: "À venir",
};
function isoOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shiftMonth(period, delta) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return isoOf(date).slice(0, 7);
}
function monthCells(period) {
  const [year, month] = period.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const count = Math.ceil((lead + days) / 7) * 7;
  const start = new Date(year, month - 1, 1 - lead);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
function monthSeances(groups, period, makeups) {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  const moved = new Set(
    (makeups || []).map(
      (item) =>
        `${item.group_id}-${String(item.original_date).slice(0, 10)}-${String(item.start_time).slice(0, 5)}`,
    ),
  );
  const rows = [];
  for (const group of groups || []) {
    if (!group.active) continue;
    const parsed = parseSchedule(group.schedule);
    for (let day = 1; day <= last; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = JS_DAY[date.getDay()];
      const iso = isoOf(date);
      for (const slot of parsed.slots) {
        if (!slot.days.includes(weekday)) continue;
        const start = String(slot.start).slice(0, 5);
        const end = String(slot.end).slice(0, 5);
        if (moved.has(`${group.id}-${iso}-${start}`)) continue;
        rows.push({
          id: `${group.id}-${iso}-${start}`,
          groupId: group.id,
          groupName: group.name,
          subject: group.subject,
          teacher: group.teacher,
          room: group.room,
          date: iso,
          start,
          end,
          originalDate: iso,
          originalStart: start,
          originalEnd: end,
          makeup: false,
        });
      }
    }
  }
  for (const item of makeups || []) {
    const iso = String(item.makeup_date).slice(0, 10);
    if (!iso.startsWith(period)) continue;
    const group = (groups || []).find((entry) => entry.id === item.group_id);
    if (!group || !group.active) continue;
    const start = String(item.makeup_start).slice(0, 5);
    rows.push({
      id: `makeup-${item.id}`,
      groupId: group.id,
      groupName: group.name,
      subject: group.subject,
      teacher: group.teacher,
      room: group.room,
      date: iso,
      start,
      end: String(item.makeup_end).slice(0, 5),
      originalDate: String(item.original_date).slice(0, 10),
      originalStart: String(item.start_time).slice(0, 5),
      originalEnd: String(item.end_time).slice(0, 5),
      makeup: true,
    });
  }
  rows.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.start.localeCompare(b.start) ||
      a.groupName.localeCompare(b.groupName, "fr"),
  );
  return rows;
}
function seanceState(item, now) {
  const start = new Date(`${item.date}T${item.start}:00`);
  const end = new Date(`${item.date}T${item.end}:00`);
  if (now >= end) return "ended";
  if (now >= start) return "live";
  return "coming";
}
function roomLabel(room) {
  const value = String(room || "").trim();
  if (!value) return "";
  return /salle/i.test(value) ? value : "Salle " + value;
}
function CalendarPage({ version, go, refresh }) {
  const [groups, error] = useData("/groups", version);
  const [makeups] = useData("/makeups", version);
  const [period, setPeriod] = useState(currentMonth());
  const [groupId, setGroupId] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(today());
  const [makeup, setMakeup] = useState(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const openMonth = (next) => {
    setPeriod(next);
    setSelected((current) =>
      current.startsWith(next)
        ? current
        : today().startsWith(next)
          ? today()
          : next + "-01",
    );
  };
  const chosen = (groups || []).find((group) => String(group.id) === groupId);
  const rooms = [
    ...new Set(
      (groups || [])
        .filter((group) => group.active && String(group.room || "").trim())
        .map((group) => String(group.room).trim()),
    ),
  ].sort((a, b) => roomLabel(a).localeCompare(roomLabel(b), "fr"));
  const stateOf = (item) => seanceState(item, now);
  const scoped = monthSeances(groups, period, makeups).filter(
    (item) =>
      (!groupId || String(item.groupId) === groupId) &&
      (!room || String(item.room || "").trim() === room),
  );
  const items = scoped.filter((item) => !status || stateOf(item) === status);
  const countOf = (state) => scoped.filter((item) => stateOf(item) === state).length;
  const dayItems = items.filter((item) => item.date === selected);
  const dayDate = new Date(selected + "T12:00:00");
  const weekday = dayDate.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayTitle = weekday.charAt(0).toLocaleUpperCase("fr") + weekday.slice(1);
  const dayMonth = dayDate.toLocaleDateString("fr-FR", { month: "short" });
  const openGroup = (event, id) => {
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(pages.groups + "/" + id);
  };
  const summary = items.length
    ? items.length + " séance" + (items.length > 1 ? "s" : "")
    : "Aucun horaire sur ce mois";
  return (
    <>
      <Heading
        eyebrow="CALENDRIER"
        title="Les séances du centre."
        description="Les horaires habituels de vos groupes."
      />
      <Load data={groups} error={error}>
        <>
          <div className="stats three">
            <Stat label="Terminées" value={countOf("ended")} icon={Check} sub={periodFR(period)} />
            <Stat
              label="En cours"
              value={countOf("live")}
              icon={Clock}
              sub="En ce moment"
              orange
            />
            <Stat label="À venir" value={countOf("coming")} icon={Calendar} sub={periodFR(period)} />
          </div>
          <div className="calendar-layout">
            <section className="panel calendar-panel">
              <div className="panel-title">
                <div>
                  <h2>{periodFR(period)}</h2>
                  <p>
                    {(chosen ? chosen.name + " · " : "") +
                      (room ? roomLabel(room) + " · " : "") +
                      (status ? SEANCE_LABEL[status] + " · " : "") +
                      summary}
                  </p>
                </div>
                <div className="cal-nav">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setPeriod(currentMonth());
                      setSelected(today());
                    }}
                  >
                    Aujourd’hui
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Mois précédent"
                    onClick={() => openMonth(shiftMonth(period, -1))}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Mois suivant"
                    onClick={() => openMonth(shiftMonth(period, 1))}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
              <div className="toolbar">
                <input
                  aria-label="Mois du calendrier"
                  type="month"
                  value={period}
                  onChange={(e) => e.target.value && openMonth(e.target.value)}
                />
                <select
                  aria-label="Groupe du calendrier"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Tous les groupes</option>
                  {(groups || [])
                    .filter((group) => group.active)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Salle du calendrier"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                >
                  <option value="">Toutes les salles</option>
                  {rooms.map((value) => (
                    <option key={value} value={value}>
                      {roomLabel(value)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Statut du calendrier"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Tous les statuts</option>
                  <option value="ended">Terminée</option>
                  <option value="live">En cours</option>
                  <option value="coming">À venir</option>
                </select>
              </div>
              <div className="cal-grid" role="grid" aria-label={"Calendrier " + periodFR(period)}>
                {WEEK_DAYS.map((day) => (
                  <span key={day.id} className="cal-dow">
                    {day.short}
                  </span>
                ))}
                {monthCells(period).map((date) => {
                  const iso = isoOf(date);
                  const outside = !iso.startsWith(period);
                  const onDay = items.filter((item) => item.date === iso);
                  if (outside)
                    return (
                      <span key={iso} className="cal-day is-out" aria-hidden="true">
                        <span className="cal-num">{date.getDate()}</span>
                      </span>
                    );
                  return (
                    <div
                      key={iso}
                      className={
                        "cal-day" +
                        (iso === today() ? " is-today" : "") +
                        (iso === selected ? " is-selected" : "")
                      }
                      onClick={() => setSelected(iso)}
                    >
                      <span className="cal-num">{date.getDate()}</span>
                      {onDay.slice(0, 3).map((item) => (
                        <a
                          key={item.id}
                          href={pages.groups + "/" + item.groupId}
                          className={"badge seance-" + stateOf(item)}
                          title={formatClock(item.start) + "–" + formatClock(item.end)}
                          onClick={(event) => openGroup(event, item.groupId)}
                        >
                          {item.groupName}
                        </a>
                      ))}
                      {onDay.length > 3 && <span className="cal-more">+{onDay.length - 3}</span>}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">
                <div className="cal-dayhead">
                  <span className="date-tile">
                    <strong>{Number(selected.slice(8))}</strong>
                    {dayMonth}
                  </span>
                  <div>
                    <h2>{dayTitle}</h2>
                    <p>
                      {dayItems.length
                        ? dayItems.length + " séance" + (dayItems.length > 1 ? "s" : "")
                        : "Journée libre"}
                    </p>
                  </div>
                </div>
              </div>
              {dayItems.length ? (
                <div className="session-list">
                  {dayItems.map((item) => {
                    const state = stateOf(item);
                    const place = [item.subject, item.teacher, roomLabel(item.room)]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={item.id}>
                        <div>
                          <a
                            href={pages.groups + "/" + item.groupId}
                            onClick={(event) => openGroup(event, item.groupId)}
                          >
                            {item.groupName}
                          </a>
                          <small>
                            {formatClock(item.start)} – {formatClock(item.end)}
                            {item.makeup ? " · Rattrapage" : ""}
                            {place ? " · " + place : ""}
                          </small>
                        </div>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={"Rattrapage pour " + item.groupName}
                            title="Rattrapage"
                            onClick={() => setMakeup(item)}
                          >
                            <CalendarClock size={17} />
                          </button>
                          <Badge value={"seance-" + state}>{SEANCE_LABEL[state]}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty text="Aucune séance ce jour." />
              )}
            </section>
          </div>
        </>
      </Load>
      {makeup && (
        <Modal title={"Rattrapage · " + makeup.groupName} onClose={() => setMakeup(null)}>
          <Form
            submit="Envoyer aux élèves et au formateur"
            onCancel={() => setMakeup(null)}
            onSubmit={async (body) => {
              const result = await api("/makeups", {
                method: "POST",
                body: {
                  group_id: makeup.groupId,
                  original_date: makeup.originalDate,
                  start_time: makeup.originalStart,
                  end_time: makeup.originalEnd,
                  makeup_date: body.makeup_date,
                  makeup_start: body.makeup_start,
                  makeup_end: body.makeup_end,
                },
              });
              setMakeup(null);
              refresh(
                result.sent
                  ? "Message envoyé à " +
                    result.sent +
                    (result.sent > 1 ? " élèves" : " élève") +
                    (result.teacher ? " et au formateur." : ".")
                  : "Message envoyé au formateur.",
              );
            }}
          >
            <p className="field wide">
              L’horaire habituel du groupe ne change pas. Seule la séance du{" "}
              {dateFR(makeup.originalDate)} est déplacée, puis le message part aux élèves inscrits et au formateur du groupe.
            </p>
            <Field label="Date du rattrapage *" name="makeup_date" type="date" required />
            <Field
              label="Début *"
              name="makeup_start"
              type="time"
              required
              defaultValue={makeup.start}
            />
            <Field
              label="Fin *"
              name="makeup_end"
              type="time"
              required
              defaultValue={makeup.end}
            />
          </Form>
        </Modal>
      )}
    </>
  );
}
function hoursFor(group, day) {
  const id = JS_DAY[new Date(day + "T12:00:00").getDay()];
  const slot = parseSchedule(group.schedule).slots.find((item) =>
    item.days.includes(id),
  );
  return slot
    ? { start: slot.start, end: slot.end }
    : { start: "18:00", end: "19:30" };
}
function Attendance({ version, refresh, path, go }) {
  const [groups, error] = useData("/groups", version),
    [enrollments] = useData("/enrollments", version),
    [sessions] = useData("/sessions", version);
  const viewId = groupIdFromPath(path);
  const day = today();
  const viewed = groups?.find((group) => group.id === viewId) || null;
  const openCount = (groupId) =>
    (enrollments || []).filter(
      (enrollment) =>
        Number(enrollment.group_id) === Number(groupId) &&
        (!enrollment.end_date || enrollment.end_date >= day),
    ).length;
  return (
    <>
      {viewId && !groups ? (
        <div className="loading">
          <RefreshCw size={20} /> Chargement…
        </div>
      ) : viewId && !viewed ? (
        <Heading
          eyebrow="PRÉSENCES"
          title="Groupe introuvable."
          description="Ce groupe n’existe pas ou a été retiré."
        >
          <Button secondary icon={ArrowLeft} onClick={() => go(pages.attendance)}>
            Retour
          </Button>
        </Heading>
      ) : viewed ? (
        <GroupCall
          group={viewed}
          enrollments={enrollments}
          sessions={sessions}
          refresh={refresh}
          onBack={() => go(pages.attendance)}
        />
      ) : (
        <>
          <Heading
            eyebrow="SUIVI PÉDAGOGIQUE"
            title="Chaque présence compte."
            description="Ouvrez un groupe, puis marquez chaque élève présent ou absent."
          />
          <Load data={groups} error={error}>
            {groups?.filter((group) => group.active).length ? (
              <div className="group-grid">
                {groups
                  .filter((group) => group.active)
                  .map((group) => {
                    const called = (sessions || []).some(
                      (session) =>
                        Number(session.group_id) === Number(group.id) &&
                        session.date === day &&
                        session.marked_count > 0,
                    );
                    return (
                      <a
                        key={group.id}
                        href={"/presences/" + group.id}
                        className="group-card attendance-card"
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                          e.preventDefault();
                          go("/presences/" + group.id);
                        }}
                      >
                        <div className="group-card-top">
                          <span className="subject-icon">
                            <BookOpen size={22} />
                          </span>
                          {called && <Badge value="present">Appel fait</Badge>}
                        </div>
                        <span className="eyebrow">{group.subject || "Spécialité à définir"}</span>
                        <h2>{group.name}</h2>
                        <p>{group.teacher || "Enseignant à définir"}</p>
                        <div className="group-meta">
                          <span>
                            <School size={15} />
                            {group.level || "Niveau à définir"}
                          </span>
                          <span>
                            <Clock size={15} />
                            {group.schedule || "Horaires à définir"}
                          </span>
                          <span>
                            <Layers size={15} />
                            {group.room || "Salle à définir"}
                          </span>
                        </div>
                        <div className="capacity">
                          <div>
                            <span>
                              {openCount(group.id) +
                                (openCount(group.id) === 1
                                  ? " élève inscrit"
                                  : " élèves inscrits")}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
              </div>
            ) : (
              <Empty text="Aucun groupe actif." />
            )}
          </Load>
        </>
      )}
    </>
  );
}
function PresenceButtons({ row, update }) {
  if (!row.markable) return <Badge value="pending">À venir</Badge>;
  return (
    <div className="presence-choice">
      <button
        type="button"
        className={row.status === "present" ? "is-present" : ""}
        onClick={() => update(row.id, { status: "present", note: "" })}
      >
        <Check size={16} /> Présent
      </button>
      <button
        type="button"
        className={row.status === "absent" ? "is-absent" : ""}
        onClick={() => update(row.id, { status: "absent" })}
      >
        <X size={16} /> Absent
      </button>
    </div>
  );
}
function AbsenceReason({ row, update, labelled = false }) {
  if (!row.markable || row.status !== "absent") return labelled ? null : "—";
  const input = (
    <input
      aria-label={"Raison pour " + row.name}
      placeholder="Maladie, retard signalé…"
      maxLength={255}
      value={row.note}
      onChange={(e) => update(row.id, { note: e.target.value })}
    />
  );
  if (!labelled) return input;
  return (
    <label>
      Raison de l’absence
      {input}
    </label>
  );
}
function GroupCall({ group, enrollments, sessions, refresh, onBack }) {
  const [day, setDay] = useState(today()),
    [dateTouched, setDateTouched] = useState(false),
    [rows, setRows] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const covers = (enrollment, date) =>
    enrollment.start_date <= date &&
    (!enrollment.end_date || enrollment.end_date >= date);
  useEffect(() => {
    if (dateTouched || !enrollments) return undefined;
    const open = enrollments.filter(
      (enrollment) =>
        Number(enrollment.group_id) === Number(group.id) &&
        (!enrollment.end_date || enrollment.end_date >= today()),
    );
    if (!open.some((enrollment) => covers(enrollment, today())) && open.length) {
      const next = open.map((enrollment) => enrollment.start_date).sort()[0];
      if (next) setDay(next);
    }
    return undefined;
  }, [dateTouched, enrollments, group.id]);
  useEffect(() => {
    if (!enrollments || !sessions) return undefined;
    let alive = true;
    const open = enrollments.filter(
      (enrollment) =>
        Number(enrollment.group_id) === Number(group.id) &&
        (!enrollment.end_date || enrollment.end_date >= day),
    );
    const blank = (enrollment, saved) => ({
      id: enrollment.student_id,
      name: enrollment.student_name,
      start: enrollment.start_date,
      markable: covers(enrollment, day),
      status: saved?.status || "",
      note: saved?.note || "",
    });
    const session = sessions.find(
      (item) => Number(item.group_id) === Number(group.id) && item.date === day,
    );
    if (!session) {
      setRows(open.map((enrollment) => blank(enrollment)));
      return () => {
        alive = false;
      };
    }
    api("/sessions/" + session.id + "/attendance")
      .then((list) => {
        if (!alive) return;
        const saved = new Map(list.map((student) => [Number(student.id), student]));
        setRows(open.map((enrollment) => blank(enrollment, saved.get(Number(enrollment.student_id)))));
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [group.id, day, enrollments, sessions]);
  const update = (id, patch) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const markable = rows?.filter((row) => row.markable) || [];
  const presentCount = markable.filter((row) => row.status === "present").length;
  const absentCount = markable.filter((row) => row.status === "absent").length;
  const unmarkedCount = markable.filter((row) => !row.status).length;
  return (
    <>
      <Heading
        eyebrow={group.subject || "Spécialité à définir"}
        title={group.name}
        description={group.schedule || "Marquez les présents et les absents."}
      >
        <Button secondary icon={ArrowLeft} onClick={onBack}>
          Retour
        </Button>
        <label className="field">
          Date de l’appel
          <input
            aria-label="Date de l’appel"
            type="date"
            value={day}
            onChange={(e) => {
              if (!e.target.value) return;
              setDateTouched(true);
              setDay(e.target.value);
            }}
          />
        </label>
      </Heading>
      {error && <div className="error">{error}</div>}
      {!rows ? (
        <div className="loading">
          <RefreshCw size={20} /> Chargement…
        </div>
      ) : (
        <section className="panel call-panel">
          <div className="panel-title">
            <div>
              <h2>Appel du {dateFR(day)}</h2>
              <p>Choisissez présent ou absent pour chaque élève.</p>
            </div>
            {markable.length ? (
              <Button
                secondary
                onClick={() =>
                  setRows(
                    rows.map((row) =>
                      row.markable ? { ...row, status: "present", note: "" } : row,
                    ),
                  )
                }
              >
                Tous présents
              </Button>
            ) : null}
          </div>
          {rows.length ? (
            <>
              <div className="call-summary">
                <span>
                  <strong>{presentCount}</strong>
                  <small>présents</small>
                </span>
                <span>
                  <strong>{absentCount}</strong>
                  <small>absents</small>
                </span>
                <span>
                  <strong>{unmarkedCount}</strong>
                  <small>non marqués</small>
                </span>
              </div>
              <div className="call-table">
                <Table headers={["Élève", "Présence", "Raison"]}>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.status === "present"
                          ? "is-present"
                          : row.status === "absent"
                            ? "is-absent"
                            : ""
                      }
                    >
                      <td>
                        <Person
                          name={row.name}
                          sub={row.markable ? "Inscrit" : "Dès le " + dateFR(row.start)}
                        />
                      </td>
                      <td>
                        <PresenceButtons row={row} update={update} />
                      </td>
                      <td>
                        <AbsenceReason row={row} update={update} />
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
              <div className="call-grid">
                {rows.map((row) => (
                  <article
                    key={row.id}
                    className={
                      "call-card" +
                      (row.status === "present"
                        ? " is-present"
                        : row.status === "absent"
                          ? " is-absent"
                          : "")
                    }
                  >
                    <Person
                      name={row.name}
                      sub={row.markable ? "Inscrit" : "Dès le " + dateFR(row.start)}
                    />
                    <PresenceButtons row={row} update={update} />
                    <AbsenceReason row={row} update={update} labelled />
                  </article>
                ))}
              </div>
            </>
          ) : (
            <Empty text="Aucun élève inscrit dans ce groupe." />
          )}
          {rows.some((row) => row.markable) ? (
            <footer className="call-footer">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const called = rows.filter((row) => row.markable);
                    if (called.some((row) => !row.status))
                      throw new Error("Marquez chaque élève présent ou absent.");
                    if (called.some((row) => row.status === "absent" && !row.note.trim()))
                      throw new Error("Indiquez la raison de chaque absence.");
                    const hours = hoursFor(group, day);
                    const session = await api("/sessions", {
                      method: "POST",
                      body: {
                        group_id: group.id,
                        date: day,
                        start_time: hours.start,
                        end_time: hours.end,
                        topic: "",
                      },
                    });
                    await api("/sessions/" + session.id + "/attendance", {
                      method: "PUT",
                      body: {
                        entries: rows
                          .filter((row) => row.markable)
                          .map((row) => ({
                            student_id: row.id,
                            status: row.status,
                            note: row.status === "absent" ? row.note.trim() : "",
                          })),
                      },
                    });
                    refresh("Appel enregistré.");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Enregistrement…" : "Enregistrer l’appel"}
              </Button>
            </footer>
          ) : null}
        </section>
      )}
    </>
  );
}
function Billing({ version, refresh, money, path, go }) {
  const [period, setPeriod] = useState(currentMonth()),
    [rows, error] = useData("/invoices?period=" + period, version),
    [groups, groupsError] = useData("/groups", version),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [pay, setPay] = useState(null),
    [receipt, setReceipt] = useState(null),
    [sendError, setSendError] = useState(""),
    [sending, setSending] = useState("");
  const viewId = billingGroupIdFromPath(path);
  const viewed = groups?.find((group) => group.id === viewId) || null;
  const scope = viewId
    ? rows?.filter((invoice) => Number(invoice.group_id) === viewId)
    : rows;
  const filtered = scope?.filter(
    (invoice) =>
      (filter === "all" || invoice.status === filter) &&
      invoice.student_name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalOf = (list, key) =>
    (list || []).reduce((sum, invoice) => sum + Number(invoice[key] || 0), 0);
  const countOf = (status) =>
    (scope || []).filter((invoice) =>
      status === "upcoming"
        ? invoice.status === "pending" || invoice.status === "partial"
        : invoice.status === status,
    ).length;
  const notify = async (key, path, success) => {
    setSendError("");
    setSending(key);
    try {
      await api(path, { method: "POST", body: {} });
      refresh(success);
    } catch (failure) {
      setSendError(failure.message);
    } finally {
      setSending("");
    }
  };
  const monthField = (
    <input
      aria-label="Mois de facturation"
      type="month"
      value={period}
      onChange={(event) => event.target.value && setPeriod(event.target.value)}
    />
  );
  return (
    <>
      {viewId && !groups ? (
        <div className="loading">
          <RefreshCw size={20} /> Chargement…
        </div>
      ) : viewId && !viewed ? (
        <Heading
          eyebrow="FINANCES"
          title="Groupe introuvable."
          description="Ce groupe n’existe pas ou a été retiré."
        >
          <Button secondary icon={ArrowLeft} onClick={() => go(pages.billing)}>
            Retour
          </Button>
        </Heading>
      ) : viewed ? (
        <>
          <Heading
            eyebrow={viewed.subject || "Spécialité à définir"}
            title={viewed.name}
            description={
              (viewed.teacher || "Enseignant à définir") +
              " · " +
              periodFR(period)
            }
          >
            <Button secondary icon={ArrowLeft} onClick={() => go(pages.billing)}>
              Retour
            </Button>
          </Heading>
          <div className="stats three">
            <Stat
              label="Facturé sur le mois"
              value={money(totalOf(scope, "amount"))}
              icon={Receipt}
              sub={periodFR(period)}
            />
            <Stat
              label="Réglé sur ces mensualités"
              value={money(totalOf(scope, "paid"))}
              icon={Wallet}
              sub="Paiements de ce groupe"
            />
            <Stat
              label="Reste à encaisser"
              value={money(totalOf(scope, "balance"))}
              icon={AlertCircle}
              sub="Solde des élèves"
              orange
            />
          </div>
          <div className="stats three">
            <Stat
              label="En retard"
              value={countOf("overdue")}
              icon={Bell}
              sub={periodFR(period)}
              orange
            />
            <Stat
              label="À venir"
              value={countOf("upcoming")}
              icon={Clock}
              sub={periodFR(period)}
            />
            <Stat
              label="Réglées"
              value={countOf("paid")}
              icon={Check}
              sub={periodFR(period)}
            />
          </div>
          <section className="panel">
            <div className="toolbar">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un élève…"
              />
              {monthField}
              <select
                aria-label="Statut de paiement"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Tous les statuts</option>
                {["pending", "partial", "overdue", "paid"].map((status) => (
                  <option key={status} value={status}>
                    {labels[status]}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="Exporter les mensualités"
                onClick={() =>
                  exportCSV(
                    "mensualites-" + viewed.name + "-" + period + ".csv",
                    filtered?.map((invoice) => ({
                      Élève: invoice.student_name,
                      Groupe: invoice.group_name,
                      Mois: invoice.period,
                      Échéance: invoice.due_date,
                      Montant: invoice.amount,
                      Payé: invoice.paid,
                      Solde: invoice.balance,
                      Statut: labels[invoice.status],
                    })) || [],
                  )
                }
              >
                <Download size={19} />
              </button>
            </div>
            <Load data={rows} error={error}>
              {sendError && (
                <div className="error" role="alert">
                  {sendError}
                </div>
              )}
              {filtered?.length ? (
                <Table
                  headers={[
                    "Élève",
                    "Échéance",
                    "Montant",
                    "Réglé",
                    "Solde",
                    "Statut",
                    "Action",
                  ]}
                >
                  {filtered.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Person name={invoice.student_name} />
                      </td>
                      <td>{dateFR(invoice.due_date)}</td>
                      <td>{money(invoice.amount)}</td>
                      <td>{money(invoice.paid)}</td>
                      <td className="amount">{money(invoice.balance)}</td>
                      <td>
                        <Badge value={invoice.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          {invoice.balance > 0 && (
                            <Button
                              secondary
                              onClick={() =>
                                setPay({
                                  ...invoice,
                                  request_key: crypto.randomUUID(),
                                })
                              }
                            >
                              Encaisser
                            </Button>
                          )}
                          {invoice.status === "overdue" && (
                            <button
                              className="icon-button"
                              aria-label={"Rappel de retard pour " + invoice.student_name}
                              disabled={sending === "remind-" + invoice.id}
                              onClick={() =>
                                notify(
                                  "remind-" + invoice.id,
                                  "/invoices/" + invoice.id + "/remind",
                                  "Rappel envoyé à " + invoice.student_name + ".",
                                )
                              }
                            >
                              {sending === "remind-" + invoice.id ? (
                                <RefreshCw className="icon-spin" size={17} />
                              ) : (
                                <Bell size={17} />
                              )}
                            </button>
                          )}
                          {!invoice.balance && invoice.last_payment_id && (
                            <>
                              <button
                                className="text-button"
                                onClick={() => setReceipt(invoice.last_payment_id)}
                              >
                                <Printer size={16} /> Imprimer le reçu
                              </button>
                              <button
                                className="icon-button"
                                aria-label={"Envoyer le reçu à " + invoice.student_name}
                                disabled={sending === "receipt-" + invoice.id}
                                onClick={() =>
                                  notify(
                                    "receipt-" + invoice.id,
                                    "/payments/" + invoice.last_payment_id + "/whatsapp",
                                    "Reçu envoyé à " + invoice.student_name + ".",
                                  )
                                }
                              >
                                {sending === "receipt-" + invoice.id ? (
                                  <RefreshCw className="icon-spin" size={17} />
                                ) : (
                                  <Send size={17} />
                                )}
                              </button>
                            </>
                          )}
                          {!invoice.balance && !invoice.last_payment_id && (
                            <span className="settled">
                              <Check size={16} /> Réglée
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <Empty text="Aucun élève sur ce mois.">
                  <span>
                    Les élèves du groupe apparaissent ici avec leur statut de
                    paiement pour {periodFR(period)}.
                  </span>
                </Empty>
              )}
            </Load>
          </section>
        </>
      ) : (
        <>
          <Heading
            eyebrow="FINANCES"
            title="Des mensualités à jour."
            description="Choisissez un mois, puis un groupe, pour voir le statut de paiement de chaque élève."
          >
            {monthField}
          </Heading>
          <div className="stats three">
            <Stat
              label="Facturé sur le mois"
              value={money(totalOf(rows, "amount"))}
              icon={Receipt}
              sub={periodFR(period)}
            />
            <Stat
              label="Réglé sur ces mensualités"
              value={money(totalOf(rows, "paid"))}
              icon={Wallet}
              sub="Tous paiements affectés à ce mois"
            />
            <Stat
              label="Reste à encaisser"
              value={money(totalOf(rows, "balance"))}
              icon={AlertCircle}
              sub="Solde des mensualités"
              orange
            />
          </div>
          <Load data={groups} error={groupsError}>
            {groups?.length ? (
              <div className="group-grid">
                {groups.map((group) => {
                  const invoices = (rows || []).filter(
                    (invoice) => Number(invoice.group_id) === Number(group.id),
                  );
                  const balance = totalOf(invoices, "balance");
                  const count = invoices.length;
                  return (
                    <a
                      key={group.id}
                      href={"/mensualites/" + group.id}
                      className="group-card attendance-card"
                      onClick={(event) => {
                        if (
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey
                        )
                          return;
                        event.preventDefault();
                        setSearch("");
                        setFilter("all");
                        go("/mensualites/" + group.id);
                      }}
                    >
                      <div className="group-card-top">
                        <span className="subject-icon">
                          <Wallet size={22} />
                        </span>
                        {!group.active ? (
                          <Badge value="excused">Archivé</Badge>
                        ) : count && balance <= 0 ? (
                          <Badge value="paid">Réglé</Badge>
                        ) : balance > 0 ? (
                          <Badge value="pending">À encaisser</Badge>
                        ) : null}
                      </div>
                      <span className="eyebrow">
                        {group.subject || "Spécialité à définir"}
                      </span>
                      <h2>{group.name}</h2>
                      <p>{group.teacher || "Enseignant à définir"}</p>
                      <div className="group-meta">
                        <span>
                          <School size={15} />
                          {group.level || "Niveau à définir"}
                        </span>
                      </div>
                      <div className="group-stats">
                        <span>
                          <strong>{money(totalOf(invoices, "amount"))}</strong>
                          <small>facturé</small>
                        </span>
                        <span>
                          <strong>{money(balance)}</strong>
                          <small>reste</small>
                        </span>
                      </div>
                      <div className="capacity">
                        <div>
                          <span>
                            {count
                              ? count + (count > 1 ? " élèves" : " élève")
                              : "Aucun élève"}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <Empty text="Aucun groupe." />
            )}
          </Load>
        </>
      )}
      {pay && (
        <Modal title="Enregistrer un paiement" onClose={() => setPay(null)}>
          <div className="payment-summary">
            <Person
              name={pay.student_name}
              sub={pay.group_name + " · " + periodFR(pay.period)}
            />
            <strong>
              {money(pay.balance)}
              <small>restant à régler</small>
            </strong>
          </div>
          <Form
            onCancel={() => setPay(null)}
            submit="Encaisser et créer le reçu"
            onSubmit={async (b) => {
              const p = await api("/payments", {
                method: "POST",
                body: {
                  ...b,
                  invoice_id: pay.id,
                  request_key: pay.request_key,
                },
              });
              setPay(null);
              refresh("Paiement enregistré.");
              setReceipt(p.id);
            }}
          >
            <Field
              label="Montant reçu *"
              type="number"
              name="amount"
              min="0.01"
              max={pay.balance}
              step="0.01"
              defaultValue={pay.balance}
              required
            />
            <Field
              label="Date du règlement *"
              type="date"
              name="paid_on"
              defaultValue={today()}
              required
            />
            <Field wide label="Mode de paiement *">
              <select name="method">
                {["cash", "transfer", "card", "cheque"].map((m) => (
                  <option value={m} key={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field wide label="Référence / note" name="note" maxLength={255} />
            <p className="form-hint wide">
              Le paiement partiel est accepté. Le solde est recalculé
              automatiquement. Un paiement enregistré est conservé dans
              l’historique.
            </p>
          </Form>
        </Modal>
      )}
      {receipt && (
        <ReceiptModal id={receipt} onClose={() => setReceipt(null)} />
      )}
    </>
  );
}
function ReceiptModal({ id, onClose }) {
  const [data, error] = useData("/payments/" + id + "/receipt", 0);
  const p = data?.payment,
    s = data?.settings;
  const cash = (n) =>
    new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: s.currency,
    }).format(Number(n));
  return (
    <Modal title="Reçu de paiement" onClose={onClose}>
      <Load data={data} error={error}>
        {data && (
          <>
            <article className="receipt-paper" id="receipt-print">
              <div className="receipt-band">
                <div>
                  <strong>{s.name}</strong>
                  <p>{[s.address, s.phone].filter(Boolean).join(" · ")}</p>
                </div>
                <span>Reçu</span>
              </div>
              <div className="receipt-body">
                <div className="receipt-title">
                  <div>
                    <span className="eyebrow">Reçu de paiement</span>
                    <h3>RC-{String(p.id).padStart(6, "0")}</h3>
                  </div>
                  <div>
                    <span className="eyebrow">Date</span>
                    <strong>{dateFR(p.paid_on)}</strong>
                  </div>
                </div>
                <p className="receipt-student">
                  <span>Reçu de</span>
                  {p.student_name}
                </p>
                <div className="receipt-grid">
                  <div>
                    <span>Groupe</span>
                    <strong>{p.group_name}</strong>
                  </div>
                  <div>
                    <span>Mensualité</span>
                    <strong>{periodFR(p.period)}</strong>
                  </div>
                  <div>
                    <span>Mode</span>
                    <strong>{labels[p.method]}</strong>
                  </div>
                  <div>
                    <span>Enregistré par</span>
                    <strong>{p.recorded_by}</strong>
                  </div>
                </div>
                {p.note && <p className="receipt-note">Référence · {p.note}</p>}
                <div className="receipt-total">
                  <span>Montant reçu</span>
                  <strong>{cash(p.amount)}</strong>
                </div>
                <div className="receipt-balances">
                  <div>
                    <span>Mensualité</span>
                    <strong>{cash(p.invoice_amount)}</strong>
                  </div>
                  <div>
                    <span>Déjà réglé</span>
                    <strong>{cash(data.paid)}</strong>
                  </div>
                  <div>
                    <span>Solde</span>
                    <strong>{cash(p.invoice_amount - data.paid)}</strong>
                  </div>
                </div>
                <p className="receipt-thanks">Merci pour votre confiance.</p>
              </div>
            </article>
            <footer>
              <Button secondary onClick={onClose}>
                Fermer
              </Button>
              <Button icon={Printer} onClick={() => window.print()}>
                Imprimer / PDF
              </Button>
            </footer>
          </>
        )}
      </Load>
    </Modal>
  );
}
function WhatsAppCentre({ phone }) {
  const [status, setStatus] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const load = () =>
      api("/whatsapp")
        .then((next) => {
          if (!alive) return;
          setStatus(next);
          setError("");
        })
        .catch((failure) => {
          if (alive) setError(failure.message);
        });
    load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  const saved = String(phone || "").replace(/\D/g, "");
  const linked = String(status?.phone || "");
  const mismatch =
    status?.connected && saved && linked && !saved.endsWith(linked) && !linked.endsWith(saved);
  return (
    <section className="panel settings-panel">
      <h2>WhatsApp du centre</h2>
      <p>
        Les messages partent de {phone || "le téléphone du centre"} vers
        l’élève. Scannez ce code une fois avec ce WhatsApp. L’icône sur la
        liste des élèves envoie ensuite le message directement.
      </p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {mismatch && (
        <div className="error" role="alert">
          Le WhatsApp connecté ({linked}) n’est pas le numéro enregistré.
          Déconnectez-le, puis scannez avec le téléphone des Paramètres.
        </div>
      )}
      {status?.connected ? (
        <div className="whatsapp-status">
          <p>Connecté avec {status.phone}. Un clic sur l’élève envoie le message.</p>
          <Button
            secondary
            onClick={async () => {
              try {
                await api("/whatsapp/logout", { method: "POST", body: {} });
              } catch (failure) {
                setError(failure.message);
              }
            }}
          >
            Déconnecter
          </Button>
        </div>
      ) : status?.qr ? (
        <img className="whatsapp-qr" src={status.qr} alt="Code de connexion WhatsApp" />
      ) : (
        <p>Connexion au WhatsApp du centre…</p>
      )}
    </section>
  );
}
function readLogo(file) {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      reject(new Error("Utilisez une image PNG, JPEG ou WebP."));
    else if (file.size > 400000)
      reject(new Error("Le logo doit faire moins de 400 Ko."));
    else {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Lecture du logo impossible."));
      reader.readAsDataURL(file);
    }
  });
}
function BrandStudio({ settings, version, refresh }) {
  const [color, setColor] = useState(settings.color || "#176658");
  const [colorDark, setColorDark] = useState(settings.color_dark || "#123b3a");
  const [logo, setLogo] = useState(settings.logo || "");
  const [logoError, setLogoError] = useState("");
  useEffect(() => {
    setColor(settings.color || "#176658");
    setColorDark(settings.color_dark || "#123b3a");
    setLogo(settings.logo || "");
  }, [settings]);
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(color))
      document.documentElement.style.setProperty("--green", color);
    if (/^#[0-9a-fA-F]{6}$/.test(colorDark))
      document.documentElement.style.setProperty("--dark", colorDark);
  }, [color, colorDark]);
  if (!settings.color) return null;
  return (
    <>
        <Heading
          eyebrow="APPARENCE"
          title="Les couleurs, le logo, les messages."
          description="Ces réglages s’appliquent à tout le centre et aux messages WhatsApp."
        />
        <Form
          key={version + ":" + (settings.welcome_message || "").length}
          submit="Enregistrer l’apparence"
          onSubmit={async (body) => {
            if (!/^#[0-9a-fA-F]{6}$/.test(color) || !/^#[0-9a-fA-F]{6}$/.test(colorDark))
              throw new Error("Indiquez une couleur au format #176658.");
            await api("/branding", {
              method: "PUT",
              body: { ...body, color, color_dark: colorDark, logo },
            });
            refresh("Apparence enregistrée.");
          }}
        >
          <section className="panel settings-panel wide">
            <h2>Couleurs</h2>
            <p>La couleur principale teinte les boutons. La couleur foncée teinte les titres et l’écran de connexion.</p>
            <div className="form-grid">
              <Field label="Couleur principale">
                <span className="color-field">
                  <input
                    aria-label="Couleur principale"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#176658"}
                    onChange={(event) => setColor(event.target.value)}
                  />
                  <input
                    aria-label="Code de la couleur principale"
                    value={color}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(event) => setColor(event.target.value)}
                  />
                </span>
              </Field>
              <Field label="Couleur foncée">
                <span className="color-field">
                  <input
                    aria-label="Couleur foncée"
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(colorDark) ? colorDark : "#123b3a"}
                    onChange={(event) => setColorDark(event.target.value)}
                  />
                  <input
                    aria-label="Code de la couleur foncée"
                    value={colorDark}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(event) => setColorDark(event.target.value)}
                  />
                </span>
              </Field>
            </div>
          </section>
          <section className="panel settings-panel wide">
            <h2>Logo</h2>
            <p>PNG, JPEG ou WebP, 400 Ko maximum. Il remplace l’icône du centre.</p>
            <div className="logo-row">
              {logo ? (
                <img className="logo-preview" src={logo} alt="Logo du centre" />
              ) : (
                <span className="brand-icon">
                  <GraduationCap size={25} />
                </span>
              )}
              <input
                aria-label="Fichier du logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    setLogoError("");
                    setLogo(await readLogo(file));
                  } catch (error) {
                    setLogoError(error.message);
                  }
                }}
              />
              {logo && (
                <button type="button" className="text-button" onClick={() => setLogo("")}>
                  Retirer le logo
                </button>
              )}
            </div>
            {logoError && (
              <div className="error" role="alert">
                {logoError}
              </div>
            )}
          </section>
          <section className="panel settings-panel wide">
            <h2>Messages WhatsApp</h2>
            <p>Chaque message part du numéro du centre. Les mots entre accolades sont remplacés à l’envoi.</p>
            <Field wide label="Bienvenue">
              <textarea
                name="welcome_message"
                className="message-template"
                rows={12}
                maxLength={4000}
                required
                defaultValue={settings.welcome_message || ""}
              />
            </Field>
            <p className="form-hint wide">
              {"{prenom}"} {"{nom}"} {"{centre}"} {"{niveau}"} {"{telephone}"} {"{groupes}"}
            </p>
            <Field wide label="Rappel de mensualité">
              <textarea
                name="reminder_message"
                className="message-template"
                rows={10}
                maxLength={4000}
                required
                defaultValue={settings.reminder_message || ""}
              />
            </Field>
            <p className="form-hint wide">
              {"{prenom}"} {"{centre}"} {"{groupe}"} {"{periode}"} {"{echeance}"} {"{montant}"} {"{reste}"} {"{telephone}"}
            </p>
            <Field wide label="Reçu de paiement">
              <textarea
                name="receipt_message"
                className="message-template"
                rows={10}
                maxLength={4000}
                required
                defaultValue={settings.receipt_message || ""}
              />
            </Field>
            <p className="form-hint wide">
              {"{prenom}"} {"{centre}"} {"{groupe}"} {"{periode}"} {"{montant}"} {"{date}"} {"{mode}"} {"{recu}"} {"{telephone}"}
            </p>
            <Field wide label="Rattrapage">
              <textarea
                name="makeup_message"
                className="message-template"
                rows={10}
                maxLength={4000}
                required
                defaultValue={settings.makeup_message || ""}
              />
            </Field>
            <p className="form-hint wide">
              {"{prenom}"} {"{groupe}"} {"{seance}"} {"{horaire}"} {"{date}"} {"{debut}"} {"{fin}"} {"{salle}"} {"{centre}"}
            </p>
          </section>
        </Form>
    </>
  );
}
function LogsPage({ version }) {
  const [rows, error] = useData("/audit", version),
    [search, setSearch] = useState("");
  const list = Array.isArray(rows) ? rows : [];
  const filtered = list.filter((row) =>
    `${row.user_name} ${roleLabel(row.user_role)} ${actionLabel(row.action)} ${row.details}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="JOURNAL"
        title="Toutes les actions."
        description="Connexions, fiches, présences, paiements, messages et apparence."
      />
      <section className="panel">
        <div className="toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Collaborateur, action, détail…"
          />
        </div>
        <Load data={rows} error={error}>
          {filtered.length ? (
            <Table headers={["Date (UTC)", "Collaborateur", "Rôle", "Action", "Détails"]}>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.created_at}</td>
                  <td>{row.user_name}</td>
                  <td>{roleLabel(row.user_role)}</td>
                  <td>{actionLabel(row.action)}</td>
                  <td>{row.details || "—"}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty text="Aucune action enregistrée." />
          )}
        </Load>
      </section>
    </>
  );
}
function SettingsPage({ settings, user, version, refresh }) {
  const [tab, setTab] = useState("centre"),
    [create, setCreate] = useState(false),
    [users, userError] = useData(
      manages(user) ? "/users" : "/auth/me",
      version,
    ),
    [audit, auditError] = useData(
      manages(user) ? "/audit" : "/auth/me",
      version,
    ),
    [error, setError] = useState("");
  return (
    <>
      <Heading
        eyebrow="CONFIGURATION"
        title="Un espace à votre image."
        description="Personnalisez votre centre et sécurisez les accès de votre équipe."
      />
      <div className="tabs">
        {(manages(user)
          ? ["centre", "équipe", "sécurité", "journal"]
          : ["sécurité"]
        ).map((t) => (
          <button
            key={t}
            className={
              (user.role === "staff" && tab === "centre" ? "sécurité" : tab) ===
              t
                ? "selected"
                : ""
            }
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {manages(user) && tab === "centre" && (
        <>
          <section className="panel settings-panel">
          <h2>Informations du centre</h2>
          <p>
            Ces informations figurent sur les reçus. Les changements
            s’appliquent aussi aux réimpressions.
          </p>
          <Form
            key={version}
            onSubmit={async (b) => {
              await api("/settings", { method: "PUT", body: b });
              refresh();
            }}
          >
            <Field
              wide
              label="Nom du centre *"
              name="name"
              maxLength={150}
              required
              defaultValue={settings.name}
            />
            <Field
              label="Téléphone"
              name="phone"
              maxLength={40}
              defaultValue={settings.phone}
            />
            <Field label="Devise">
              <select name="currency" defaultValue={settings.currency}>
                <option>MAD</option>
                <option>EUR</option>
                <option>USD</option>
              </select>
            </Field>
            <Field
              wide
              label="Adresse"
              name="address"
              maxLength={255}
              defaultValue={settings.address}
            />
            <Field
              label="Jour d’échéance mensuelle"
              name="due_day"
              type="number"
              min="1"
              max="28"
              defaultValue={settings.due_day}
              required
            />
            <p className="form-hint wide">
              S’applique aux nouvelles mensualités. La devise est verrouillée
              dès la première mensualité. Le téléphone ci-dessus est le numéro
              WhatsApp qui envoie les messages. Les textes de ces messages se
              règlent depuis le compte super administrateur.
            </p>
          </Form>
        </section>
          <WhatsAppCentre phone={settings.phone} />
        </>
      )}
      {manages(user) && tab === "équipe" && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Votre équipe</h2>
              <p>
                Les gestionnaires accèdent aux opérations quotidiennes. La
                configuration et les comptes sont réservés aux administrateurs.
              </p>
            </div>
            <Button icon={Plus} onClick={() => setCreate(true)}>
              Ajouter
            </Button>
          </div>
          {error && <div className="error">{error}</div>}
          <Load data={users} error={userError}>
            {Array.isArray(users) && (
              <Table headers={["Collaborateur", "Rôle", "Statut", "Action"]}>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Person name={u.name} sub={u.email} />
                    </td>
                    <td>
                      {roleLabel(u.role)}
                    </td>
                    <td>
                      <Badge value={u.active ? "present" : "excused"}>
                        {u.active ? "Actif" : "Désactivé"}
                      </Badge>
                    </td>
                    <td>
                      {u.id !== user.id && (
                        <button
                          className="text-button"
                          onClick={async () => {
                            try {
                              await api("/users/" + u.id, {
                                method: "PATCH",
                                body: { active: !u.active },
                              });
                              refresh();
                            } catch (e) {
                              setError(e.message);
                            }
                          }}
                        >
                          {u.active ? "Désactiver" : "Réactiver"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Load>
        </section>
      )}
      {(tab === "sécurité" || user.role === "staff") && (
        <section className="panel settings-panel">
          <h2>Changer votre mot de passe</h2>
          <p>Choisissez un mot de passe personnel d’au moins 12 caractères.</p>
          <Form
            onSubmit={async (b) => {
              if (b.password !== b.confirm)
                throw new Error("Les mots de passe ne correspondent pas.");
              await api("/auth/password", { method: "POST", body: b });
              refresh("Mot de passe modifié.");
            }}
          >
            <Field
              wide
              label="Mot de passe actuel"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
            <Field
              wide
              label="Nouveau mot de passe"
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <Field
              wide
              label="Confirmer"
              name="confirm"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Form>
        </section>
      )}
      {manages(user) && tab === "journal" && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Journal des opérations</h2>
              <p>
                500 dernières opérations du centre.
              </p>
            </div>
          </div>
          <Load data={audit} error={auditError}>
            {Array.isArray(audit) && audit.length ? (
              <Table
                headers={[
                  "Date (UTC)",
                  "Collaborateur",
                  "Opération",
                  "Détails",
                ]}
              >
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.created_at}</td>
                    <td>{a.user_name}</td>
                    <td>{actionLabel(a.action)}</td>
                    <td>{a.details}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <Empty text="Aucune opération enregistrée." />
            )}
          </Load>
        </section>
      )}
      {create && (
        <Modal
          title="Ajouter un collaborateur"
          onClose={() => setCreate(false)}
        >
          <Form
            onCancel={() => setCreate(false)}
            onSubmit={async (b) => {
              await api("/users", { method: "POST", body: b });
              setCreate(false);
              refresh();
            }}
          >
            <Field
              wide
              label="Nom complet *"
              name="name"
              maxLength={120}
              required
            />
            <Field wide label="E-mail *" name="email" type="email" required />
            <Field
              wide
              label="Mot de passe initial *"
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
            <Field wide label="Rôle">
              <select name="role">
                <option value="staff">Gestionnaire</option>
                <option value="admin">Administrateur</option>
              </select>
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
