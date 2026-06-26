import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Admin() {
  const [data, setData] = useState({ site: {}, services: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminPass, setAdminPass] = useState(localStorage.getItem('admin_password')||'');
  const [token, setToken] = useState(localStorage.getItem('admin_token')||'');
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token')||!!localStorage.getItem('admin_password'));
  const [loginUser, setLoginUser] = useState(localStorage.getItem('admin_user')||'');
  const [regUser, setRegUser] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regSecret, setRegSecret] = useState('');
  const [activeTab, setActiveTab] = useState('site');
  const [smtpCfg, setSmtpCfg] = useState({host:'',port:587,secure:false,user:'',pass:'',from:'',to:''});
  const [smtpTest, setSmtpTest] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(()=>{
    axios.get('/api/site').then(r=>{ setData(r.data); setLoading(false); });
  },[]);

  // normalize projects to ensure images array exists
  useEffect(()=>{
    if (!loading && data.projects) {
      const copy = {...data};
      copy.projects = copy.projects.map(p => ({ ...p, images: p.images ? p.images : (p.image ? [p.image] : []) }));
      setData(copy);
    }
  },[loading]);

  const addService = () => {
    const id = Date.now();
    setData({...data, services:[...data.services, {id, title:'New Service', desc:'', items:[]} ]});
  };

  const addProject = () => {
    const id = Date.now();
    setData({...data, projects:[...data.projects, {id, title:'New Project', desc:'', image:'', images:[]} ]});
  };

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const headers = { 'Content-Type':'multipart/form-data' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    else if (adminPass) headers['x-admin-password'] = adminPass;
    const res = await axios.post('/api/upload', fd, { headers });
    return res.data.url;
  };

  const save = async ()=>{
    setSaving(true);
    const headers = {};
    if (token) headers['authorization'] = `Bearer ${token}`;
    else if (adminPass) headers['x-admin-password'] = adminPass;
    await axios.post('/api/site', data, { headers });
    setSaving(false);
    alert('Saved');
  };

  const handleLogin = async () => {
    // attempt JWT login
    try {
      const r = await axios.post('/api/admin/login', { username: loginUser, password: adminPass });
      const t = r.data && r.data.token;
      if (t) {
        localStorage.setItem('admin_token', t);
        if (loginUser) localStorage.setItem('admin_user', loginUser);
        setToken(t);
        setLoggedIn(true);
        alert('Logged in (token stored).');
        return;
      }
    } catch (e) {
      // fall through to legacy save
    }
    // fallback: store raw password (legacy header)
    localStorage.setItem('admin_password', adminPass);
    setLoggedIn(true);
    alert('Admin password saved locally (legacy mode).');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_password');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminPass('');
    setToken('');
    setLoggedIn(false);
    alert('Logged out');
  };

  const testSmtp = async () => {
    setSmtpTest('Testing...');
    try {
      const headers = {};
      if (token) headers['authorization'] = `Bearer ${token}`;
      else if (adminPass) headers['x-admin-password'] = adminPass;
      await axios.post('/api/test-smtp', smtpCfg, { headers });
      setSmtpTest('SMTP test sent successfully');
    } catch (e) {
      setSmtpTest('SMTP test failed: ' + (e.response?.data?.error || e.message));
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="admin-page">
      {!loggedIn ? (
        <div className="admin-login-container">
          <div className="admin-login-card">
            <h1 style={{color:'var(--navy)',marginBottom:'1.5rem'}}>Admin Login</h1>
            <div className="form-group">
              <label>Username (optional)</label>
              <input placeholder="Leave empty to use server secret" value={loginUser} onChange={e=>setLoginUser(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} />
            </div>
            <button className="btn" onClick={handleLogin} style={{width:'100%',marginTop:'1rem'}}>Login</button>
            <div style={{marginTop:'2rem',borderTop:'1px solid #eee',paddingTop:'2rem'}}>
              <h3 style={{color:'var(--navy)',marginBottom:'1rem'}}>Register New Admin</h3>
              <div className="form-group">
                <label>Username</label>
                <input placeholder="admin" value={regUser} onChange={e=>setRegUser(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="password" value={regPass} onChange={e=>setRegPass(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Server Admin Secret</label>
                <input type="password" placeholder="ADMIN_PASSWORD" value={regSecret} onChange={e=>setRegSecret(e.target.value)} />
              </div>
              <button className="btn" onClick={async ()=>{if(!regUser||!regPass||!regSecret){alert('Fill all fields');return}try{await axios.post('/api/api/admin/register',{username:regUser,password:regPass},{headers:{'x-admin-password':regSecret}});alert('User created');setRegUser('');setRegPass('');setRegSecret('');}catch(e){alert('Register failed: '+(e.response?.data?.error||e.message))}}} style={{width:'100%'}}>Register</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="admin-header">
            <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
              <h1 style={{color:'var(--white)',margin:0,fontSize:'1.8rem'}}>Admin Dashboard</h1>
              <button className="btn" onClick={handleLogout} style={{background:'rgba(255,255,255,0.2)',color:'var(--white)'}}>Logout</button>
            </div>
          </div>

          <div className="container">
            <div className="admin-tabs">
              {['site','services','projects','contacts','settings'].map(tab=> (
                <button key={tab} className={`tab ${activeTab===tab?'active':''}`} onClick={()=>setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase()+tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab==='site' && (
              <div className="admin-section">
                <h2>Site Settings</h2>
                <div className="form-card">
                  <div className="form-group">
                    <label>Site Title</label>
                    <input value={data.site.title||''} onChange={e=>setData({...data, site:{...data.site, title:e.target.value}})} />
                  </div>
                  <div className="form-group">
                    <label>Tagline</label>
                    <input value={data.site.tagline||''} onChange={e=>setData({...data, site:{...data.site, tagline:e.target.value}})} />
                  </div>
                </div>
              </div>
            )}

            {activeTab==='services' && (
              <div className="admin-section">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
                  <h2>Services</h2>
                  <button className="btn" onClick={addService}>+ Add Service</button>
                </div>
                <div className="items-list">
                  {data.services.map((s,idx)=> (
                    <div key={s.id} className="item-card">
                      <input className="item-title" value={s.title} onChange={e=>{const copy=[...data.services];copy[idx].title=e.target.value;setData({...data,services:copy});}} placeholder="Title" />
                      <textarea className="item-desc" value={s.desc} onChange={e=>{const copy=[...data.services];copy[idx].desc=e.target.value;setData({...data,services:copy});}} placeholder="Description" />
                      <div style={{marginTop:'1rem'}}>
                        <div style={{fontWeight:'700',marginBottom:'0.5rem',color:'var(--navy)'}}>Items</div>
                        {s.items.map((it,i)=> (<input key={i} className="item-input" value={it} onChange={e=>{const copy=[...data.services];copy[idx].items[i]=e.target.value;setData({...data,services:copy});}} />))}
                        <button className="btn" onClick={()=>{const copy=[...data.services];copy[idx].items.push('New');setData({...data,services:copy});}} style={{marginTop:'0.5rem'}}>+ Add Item</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab==='projects' && (
              <div className="admin-section">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
                  <h2>Projects</h2>
                  <button className="btn" onClick={addProject}>+ Add Project</button>
                </div>
                <div className="items-list">
                  {data.projects.map((p,idx)=> (
                    <div key={p.id} className="item-card">
                      <input className="item-title" value={p.title} onChange={e=>{const copy=[...data.projects];copy[idx].title=e.target.value;setData({...data,projects:copy});}} placeholder="Title" />
                      <textarea className="item-desc" value={p.desc} onChange={e=>{const copy=[...data.projects];copy[idx].desc=e.target.value;setData({...data,projects:copy});}} placeholder="Description" />
                      <div style={{marginTop:'1rem'}}>
                        <div style={{fontWeight:'700',marginBottom:'0.5rem',color:'var(--navy)'}}>Images</div>
                        <div className="thumb-grid">{(p.images||[]).map((u,i)=> (<div key={i} className="thumb"><img src={u} alt={`img-${i}`} /><button className="btn" style={{marginTop:'0.4rem',fontSize:'0.8rem'}} onClick={()=>{const copy=[...data.projects];copy[idx].images=copy[idx].images.filter((_,j)=>j!==i);setData({...data,projects:copy});}}>Remove</button></div>))}</div>
                        <input type="file" multiple onChange={async e=>{const files=Array.from(e.target.files||[]);if(files.length===0)return;const uploaded=[];for(const f of files){const url=await uploadImage(f);uploaded.push(url);}const copy=[...data.projects];copy[idx].images=[...(copy[idx].images||[]),...uploaded];setData({...data,projects:copy});}} style={{marginTop:'0.5rem'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab==='contacts' && (
              <div className="admin-section">
                <h2>Contact Submissions</h2>
                <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem'}}>
                  <button className="btn" onClick={async ()=>{setLoadingContacts(true);try{const headers={};if(token)headers['authorization']=`Bearer ${token}`;else if(adminPass)headers['x-admin-password']=adminPass;const r=await axios.get('/api/api/contacts',{headers});setContacts(r.data||[]);}catch(e){alert('Failed to load');}setLoadingContacts(false);}}>{loadingContacts?'Loading...':'Refresh'}</button>
                  <button className="btn" onClick={async ()=>{try{const headers={};if(token)headers['authorization']=`Bearer ${token}`;else if(adminPass)headers['x-admin-password']=adminPass;const r=await axios.get('/api/api/contacts/export',{headers,responseType:'blob'});const url=window.URL.createObjectURL(new Blob([r.data]));const link=document.createElement('a');link.href=url;link.setAttribute('download','contacts.csv');document.body.appendChild(link);link.click();link.parentNode.removeChild(link);}catch(e){alert('Export failed')}}} className="btn">Export CSV</button>
                </div>
                <div className="table-card">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Project</th><th>Date</th></tr></thead>
                    <tbody>{contacts.map(c=> (<tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.project_type}</td><td>{new Date(c.date).toLocaleDateString()}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab==='settings' && (
              <div className="admin-section">
                <h2>Settings</h2>
                <div className="form-card">
                  <h3>SMTP Configuration</h3>
                  <div className="form-grid">
                    <div className="form-group"><label>SMTP Host</label><input placeholder="smtp.gmail.com" value={smtpCfg.host} onChange={e=>setSmtpCfg({...smtpCfg,host:e.target.value})} /></div>
                    <div className="form-group"><label>Port</label><input placeholder="587" value={smtpCfg.port} onChange={e=>setSmtpCfg({...smtpCfg,port:e.target.value})} /></div>
                    <div className="form-group"><label>User</label><input placeholder="your@email.com" value={smtpCfg.user} onChange={e=>setSmtpCfg({...smtpCfg,user:e.target.value})} /></div>
                    <div className="form-group"><label>Password</label><input type="password" value={smtpCfg.pass} onChange={e=>setSmtpCfg({...smtpCfg,pass:e.target.value})} /></div>
                    <div className="form-group"><label>From</label><input placeholder="noreply@example.com" value={smtpCfg.from} onChange={e=>setSmtpCfg({...smtpCfg,from:e.target.value})} /></div>
                    <div className="form-group"><label>To</label><input placeholder="admin@example.com" value={smtpCfg.to} onChange={e=>setSmtpCfg({...smtpCfg,to:e.target.value})} /></div>
                  </div>
                  <button className="btn" onClick={testSmtp} style={{marginTop:'1rem'}}>Test SMTP</button>
                  {smtpTest && <p style={{marginTop:'1rem',color:smtpTest.includes('successfully')?'green':'red'}}>{smtpTest}</p>}
                </div>
              </div>
            )}

            <div style={{marginTop:'2rem',paddingTop:'2rem',borderTop:'1px solid #eee'}}>
              <button className="btn btn-primary" onClick={save} disabled={saving} style={{padding:'0.9rem 2rem',fontSize:'1rem'}}>
                {saving?'Saving...':'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
