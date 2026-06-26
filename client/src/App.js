import React, { useEffect, useState } from 'react';
import axios from 'axios';
axios.defaults.baseURL = window.location.origin;
import Admin from './Admin';

function Header({ site, showNav, setShowNav }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="logo">
          <img src="/logo.svg" alt="logo" className="logo-img" />
          <span className="logo-text">{site.title || 'Debbs Renos'}</span>
        </div>
        <button className="nav-toggle" onClick={()=>setShowNav(!showNav)} aria-label="Toggle navigation">☰</button>
        <nav className={`nav ${showNav? 'nav-open':''}`}>
          <a href="/" onClick={()=>setShowNav(false)}>Home</a>
          <a href="/#services" onClick={()=>setShowNav(false)}>Services</a>
          <a href="/#projects" onClick={()=>setShowNav(false)}>Projects</a>
          <a href="/gallery" onClick={()=>setShowNav(false)}>Gallery</a>
          <a href="/#contact" className="btn btn-small" onClick={()=>setShowNav(false)}>Get a Quote</a>
        </nav>
      </div>
    </header>
  );
}

function Hero({ site }) {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-text">
          <h1>{site.tagline || 'Transforming Homes With Craftsmanship & Integrity'}</h1>
          <p>Winnipeg’s trusted renovation and general contracting experts.</p>
          <div className="hero-actions">
            <a href="#contact" className="btn">Request a Free Estimate</a>
            <a href="#projects" className="btn btn-outline">View Our Work</a>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-image-placeholder">Debbs Renos — Built to Last</div>
        </div>
      </div>
    </section>
  );
}

function Services({ services }) {
  return (
    <section id="services" className="section section-light">
      <div className="container">
        <h2 className="section-title">Our Services</h2>
        <div className="grid services-grid">
          {services.map(s => (
            <div className="card" key={s.id}>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <ul>
                {s.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects({ projects }) {
  return (
    <section id="projects" className="section">
      <div className="container">
        <h2 className="section-title">Recent Projects</h2>
        <div className="grid projects-grid">
          {projects.map(p => (
            <div className="project-card" key={p.id}>
              <div className="project-image" style={{backgroundImage:`url(${p.image})`}}></div>
              <div className="project-body">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [data, setData] = useState({ site: {}, services: [], projects: [] });
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', address: '', budget: '', preferred_date: '', project_type: '', message: '' });
  const [formNote, setFormNote] = useState('');
  const [showNav, setShowNav] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    axios.get('/api/site').then(r => setData(r.data));
  }, []);

  const path = window.location.pathname;

  if (path === '/admin') {
    return <Admin />;
  }

  if (path === '/gallery') {
    return (
      <div>
        <Header site={data.site} showNav={showNav} setShowNav={setShowNav} />
        <section className="section section-light">
          <div className="container">
            <h2 className="section-title">Project Gallery</h2>
            <div className="grid projects-grid">
              {data.projects.map(p => (
                <div className="project-card" key={p.id}>
                  <div className="project-image" style={{backgroundImage:`url(${p.image})`}} onClick={()=>setModalImage(p.image)}></div>
                  <div className="project-body"><h3>{p.title}</h3><p>{p.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>
        {modalImage && (
          <div className="modal" onClick={()=>setModalImage(null)}>
            <div className="modal-inner"><img src={modalImage} alt="preview" /></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Header site={data.site} showNav={showNav} setShowNav={setShowNav} />
      <Hero site={data.site} />
      <Services services={data.services} />
      <Projects projects={(data.projects||[]).slice(0,4)} />

      <section id="contact" className="section">
        <div className="container">
          <div className="contact-grid">
            <div>
              <h2 className="section-title">Request a Free Estimate</h2>
              <p className="section-subtitle">Tell us about your project — we’ll respond within one business day.</p>
              <form className="contact-form" onSubmit={async (e)=>{
                e.preventDefault();
                setFormNote('Sending...');
                try{
                  await axios.post('/api/contact', formState);
                  setFormNote('Thanks — your request has been received.');
                  setFormState({ name:'', email:'', phone:'', address:'', budget:'', preferred_date:'', project_type:'', message:'' });
                }catch(err){
                  setFormNote('Sorry — there was an error.');
                }
              }}>
                <div className="form-grid">
                  <div className="form-group"><label>Name*</label><input required value={formState.name} onChange={e=>setFormState({...formState,name:e.target.value})} /></div>
                  <div className="form-group"><label>Email*</label><input type="email" required value={formState.email} onChange={e=>setFormState({...formState,email:e.target.value})} /></div>
                  <div className="form-group"><label>Phone*</label><input required value={formState.phone} onChange={e=>setFormState({...formState,phone:e.target.value})} /></div>
                  <div className="form-group"><label>Project Type*</label>
                    <select required value={formState.project_type} onChange={e=>setFormState({...formState,project_type:e.target.value})}>
                      <option value="">Select one</option>
                      <option>Kitchen renovation</option>
                      <option>Bathroom renovation</option>
                      <option>Basement finishing</option>
                      <option>Home addition</option>
                      <option>General repairs / other</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Preferred Date</label><input type="date" value={formState.preferred_date} onChange={e=>setFormState({...formState,preferred_date:e.target.value})} /></div>
                  <div className="form-group"><label>Estimated Budget</label><input value={formState.budget} onChange={e=>setFormState({...formState,budget:e.target.value})} placeholder="e.g., $5,000 - $10,000" /></div>
                </div>
                <div className="form-group"><label>Project Details</label><textarea rows={6} value={formState.message} onChange={e=>setFormState({...formState,message:e.target.value})} placeholder="Tell us about the scope, timelines, and any special requests." /></div>
                <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
                  <button className="btn" type="submit">Submit Request</button>
                  <div style={{color:'var(--muted)'}}>{formNote}</div>
                </div>
              </form>
            </div>
            <aside className="contact-sidebar card">
              <h3>Contact</h3>
              <p><strong>Phone:</strong> (204) 555‑1234</p>
              <p><strong>Email:</strong> info@debbsrenos.ca</p>
              <p><strong>Service Area:</strong> Winnipeg & surrounding communities</p>
              <h4 style={{marginTop:12}}>Hours</h4>
              <p style={{marginBottom:4}}>Mon–Fri: 8am – 5pm</p>
              <p style={{marginBottom:4}}>Sat: By appointment</p>
              <p>Sun: Closed</p>
            </aside>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>© {new Date().getFullYear()} Debbs Renos and General Contracting Inc.</p>
        </div>
      </footer>
      {modalImage && (
        <div className="modal" onClick={()=>setModalImage(null)}>
          <div className="modal-inner"><img src={modalImage} alt="preview" /></div>
        </div>
      )}
    </div>
  );
}
