import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { 
  Building2, Users, Calendar, Award, Bell, FileText, 
  Phone, MessageSquare, Plus, ShieldCheck, DollarSign, TrendingUp
} from 'lucide-react';

export default function App() {
  const [role, setRole] = useState('associate');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [visits, setVisits] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const associate = {
    name: 'Rajesh Sharma',
    id: 'BMS-8421',
    slab: 'Silver Partner',
    slabRate: '2.5%',
    totalSales: '₹ 85,00,000',
    nextSlabTarget: '₹ 1,00,00,000',
    earnedCommission: '₹ 2,12,500'
  };

  const fetchData = async () => {
    try {
      const { data: lData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (lData) setLeads(lData);

      const { data: vData } = await supabase.from('site_visits').select('*').order('created_at', { ascending: false });
      if (vData) setVisits(vData);

      const { data: aData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (aData) setAnnouncements(aData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' });

  const [showAddVisit, setShowAddVisit] = useState(false);
  const [newVisit, setNewVisit] = useState({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested' });

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;
    const { error } = await supabase.from('leads').insert([newLead]);
    if (!error) {
      await fetchData();
      setNewLead({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' });
      setShowAddLead(false);
    }
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    if (!newVisit.client || !newVisit.date) return;
    const { error } = await supabase.from('site_visits').insert([{
      client: newVisit.client,
      project: newVisit.project,
      visit_date: newVisit.date,
      visit_time: newVisit.time,
      vehicle: newVisit.vehicle,
      status: 'Confirmed'
    }]);
    if (!error) {
      await fetchData();
      setNewVisit({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested' });
      setShowAddVisit(false);
    }
  };

  return (
    <div className="bms-container">
      <header className="bms-header">
        <div className="header-left">
          <div className="logo-box"><Building2 size={24} /></div>
          <div>
            <h1 className="brand-title">BMS REAL ESTATES</h1>
            <p className="brand-subtitle">{role === 'associate' ? 'Associate Business Portal' : 'Admin Control Panel'}</p>
          </div>
        </div>
        <div className="header-right">
          <button className="role-badge-btn" onClick={() => setRole(role === 'associate' ? 'admin' : 'associate')}>
            <ShieldCheck size={16} /> Switch to {role === 'associate' ? 'Admin' : 'Associate'}
          </button>
          <div className="user-profile-pill">
            <div className="avatar-circle">{associate.name[0]}</div>
            <div className="user-text">
              <span className="user-name">{role === 'associate' ? associate.name : 'Super Admin'}</span>
              <span className="user-id">{role === 'associate' ? associate.id : 'ADMIN-01'}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="bms-nav">
        <div className="nav-items">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Building2 },
            { id: 'leads', label: 'Leads & Customers', icon: Users, badge: leads.length },
            { id: 'visits', label: 'Site Visits', icon: Calendar, badge: visits.length },
            { id: 'commission', label: 'Commission & Slabs', icon: Award },
            { id: 'announcements', label: 'Announcements', icon: Bell, badge: announcements.length },
            { id: 'documents', label: 'Docs', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && <span className="nav-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="bms-content">
        {activeTab === 'dashboard' && (
          <div className="view-grid">
            <div className="welcome-banner">
              <div>
                <h2>Namaste, {associate.name}! 👋</h2>
                <p>Welcome back to BMS Real Estates. Your current rank is <strong className="gold-text">{associate.slab} ({associate.slabRate})</strong>.</p>
              </div>
              <div className="quick-action-buttons">
                <button className="btn-primary" onClick={() => { setActiveTab('leads'); setShowAddLead(true); }}><Plus size={16} /> Add Lead</button>
                <button className="btn-secondary" onClick={() => { setActiveTab('visits'); setShowAddVisit(true); }}><Calendar size={16} /> Schedule Visit</button>
              </div>
            </div>

            <div className="metrics-row">
              <div className="metric-card gold-border">
                <div className="metric-header"><span>Earned Commission</span><DollarSign className="metric-icon gold" /></div>
                <h3>{associate.earnedCommission}</h3>
                <span className="metric-sub green-text">✓ Payout Active</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>Active Leads</span><Users className="metric-icon blue" /></div>
                <h3>{leads.length}</h3>
                <span className="metric-sub">Live in Cloud</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>Scheduled Visits</span><Calendar className="metric-icon green" /></div>
                <h3>{visits.length}</h3>
                <span className="metric-sub">Mumbai ap-south-1</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>Slab Rate</span><TrendingUp className="metric-icon purple" /></div>
                <h3>{associate.slabRate}</h3>
                <span className="metric-sub">{associate.slab}</span>
              </div>
            </div>

            <div className="slab-progress-card">
              <div className="progress-header">
                <div>
                  <strong>Next Level Target: Gold Partner (3.0% Commission)</strong>
                  <p>Current Progress: {associate.totalSales} / {associate.nextSlabTarget}</p>
                </div>
                <span className="badge-gold">85% Complete</span>
              </div>
              <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: '85%' }}></div></div>
            </div>

            <div className="two-column-grid">
              <div className="panel-card">
                <div className="panel-head">
                  <h3>Recent Customer Leads (Live Supabase)</h3>
                  <button className="text-link" onClick={() => setActiveTab('leads')}>View All</button>
                </div>
                <div className="list-stack">
                  {leads.slice(0, 3).map(l => (
                    <div key={l.id} className="list-item">
                      <div>
                        <strong>{l.name}</strong>
                        <p className="sub-detail">{l.project} • {l.budget}</p>
                      </div>
                      <span className={`status-pill ${l.status?.replace(/\s+/g, '-').toLowerCase()}`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-head">
                  <h3>Upcoming Property Visits</h3>
                  <button className="text-link" onClick={() => setActiveTab('visits')}>View All</button>
                </div>
                <div className="list-stack">
                  {visits.slice(0, 3).map(v => (
                    <div key={v.id} className="list-item">
                      <div>
                        <strong>{v.client}</strong>
                        <p className="sub-detail">{v.project} • {v.visit_date} at {v.visit_time}</p>
                      </div>
                      <div className="action-buttons-group">
                        <a href="tel:9829012345" className="btn-icon"><Phone size={14} /></a>
                        <a href="https://wa.me/919829012345" target="_blank" rel="noreferrer" className="btn-icon green"><MessageSquare size={14} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>Associate Leads & Customers (Live Database)</h2>
                <p>Nayi lead add karein — yeh sidha Supabase cloud database me save hogi.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddLead(true)}><Plus size={16} /> Add New Lead</button>
            </div>

            {showAddLead && (
              <form className="entry-form-card" onSubmit={handleAddLead}>
                <h3>Register New Customer Lead</h3>
                <div className="form-grid">
                  <div>
                    <label>Customer Full Name *</label>
                    <input type="text" placeholder="e.g. Ramesh Patel" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required />
                  </div>
                  <div>
                    <label>Phone / WhatsApp *</label>
                    <input type="tel" placeholder="e.g. 9829012345" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label>Interested Project</label>
                    <select value={newLead.project} onChange={e => setNewLead({ ...newLead, project: e.target.value })}>
                      <option>BMS Royal City, Jagatpura</option>
                      <option>BMS Greens, Ajmer Road</option>
                      <option>BMS Heights, Mansarovar</option>
                      <option>BMS Industrial Park</option>
                    </select>
                  </div>
                  <div>
                    <label>Estimated Budget</label>
                    <input type="text" placeholder="e.g. ₹ 40-50 Lakhs" value={newLead.budget} onChange={e => setNewLead({ ...newLead, budget: e.target.value })} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save to Live Database</button>
                  <button type="button" className="btn-outline" onClick={() => setShowAddLead(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrapper">
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone / WhatsApp</th>
                    <th>Target Project</th>
                    <th>Budget</th>
                    <th>Status</th>
                    <th>Quick Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td><strong>{lead.name}</strong></td>
                      <td>{lead.phone}</td>
                      <td>{lead.project}</td>
                      <td>{lead.budget}</td>
                      <td><span className={`status-pill ${lead.status?.replace(/\s+/g, '-').toLowerCase()}`}>{lead.status}</span></td>
                      <td>
                        <div className="table-actions">
                          <a href={`tel:${lead.phone}`} className="btn-icon"><Phone size={15} /></a>
                          <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}?text=Hello ${lead.name}, regarding BMS Real Estates.`} target="_blank" rel="noreferrer" className="btn-icon green"><MessageSquare size={15} /></a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>Site / Property Visits (Live Schedule)</h2>
                <p>Nayi visit schedule karein — staff ko real-time notification milega.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddVisit(true)}><Calendar size={16} /> Book New Site Visit</button>
            </div>

            {showAddVisit && (
              <form className="entry-form-card" onSubmit={handleAddVisit}>
                <h3>Schedule Site Visit</h3>
                <div className="form-grid">
                  <div>
                    <label>Client Name *</label>
                    <input type="text" placeholder="e.g. Anita Meena" value={newVisit.client} onChange={e => setNewVisit({ ...newVisit, client: e.target.value })} required />
                  </div>
                  <div>
                    <label>Project Location</label>
                    <select value={newVisit.project} onChange={e => setNewVisit({ ...newVisit, project: e.target.value })}>
                      <option>BMS Royal City, Jagatpura</option>
                      <option>BMS Greens, Ajmer Road</option>
                      <option>BMS Heights, Mansarovar</option>
                    </select>
                  </div>
                  <div>
                    <label>Visit Date *</label>
                    <input type="date" value={newVisit.date} onChange={e => setNewVisit({ ...newVisit, date: e.target.value })} required />
                  </div>
                  <div>
                    <label>Visit Time</label>
                    <input type="text" placeholder="e.g. 11:30 AM" value={newVisit.time} onChange={e => setNewVisit({ ...newVisit, time: e.target.value })} />
                  </div>
                  <div>
                    <label>Transport</label>
                    <select value={newVisit.vehicle} onChange={e => setNewVisit({ ...newVisit, vehicle: e.target.value })}>
                      <option>Cab Requested from BMS Office</option>
                      <option>Self Transport by Client</option>
                      <option>Associate Bringing Client</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save to Live Database</button>
                  <button type="button" className="btn-outline" onClick={() => setShowAddVisit(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrapper">
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Property / Project</th>
                    <th>Date & Time</th>
                    <th>Transport</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.client}</strong></td>
                      <td>{v.project}</td>
                      <td>{v.visit_date} ({v.visit_time})</td>
                      <td>{v.vehicle}</td>
                      <td><span className="status-pill visited">{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'commission' && (
          <div className="section-container">
            <div className="section-header">
              <h2>BMS Real Estates Commission Slabs</h2>
              <p>Transparent multi-tier commission structure for verified associates.</p>
            </div>
            <div className="slabs-grid">
              {[
                { name: 'Bronze Associate', range: 'Up to ₹ 50 Lakhs', rate: '2.0%', active: false },
                { name: 'Silver Associate', range: '₹ 50 Lakhs – ₹ 1 Crore', rate: '2.5%', active: true, tag: 'YOUR ACTIVE SLAB' },
                { name: 'Gold Associate', range: '₹ 1 Crore – ₹ 3 Crores', rate: '3.0%', active: false },
                { name: 'Platinum Partner', range: 'Above ₹ 3 Crores', rate: '3.5%', active: false },
              ].map((s, i) => (
                <div key={i} className={`slab-card ${s.active ? 'active-slab' : ''}`}>
                  {s.tag && <div className="slab-badge">{s.tag}</div>}
                  <h3>{s.name}</h3>
                  <div className="slab-rate">{s.rate}</div>
                  <p className="slab-range">Sales: {s.range}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="section-container">
            <div className="section-header">
              <h2>Company Announcements (Live Supabase)</h2>
              <p>Latest project launches and bonus notices from Mumbai cloud.</p>
            </div>
            <div className="announcements-stack">
              {announcements.map(item => (
                <div key={item.id} className="announcement-item">
                  <div className="announcement-meta">
                    <span className="tag-pill">{item.tag}</span>
                    <span className="date-sub">Active</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="section-container">
            <div className="section-header">
              <h2>Project Brochures & Marketing Material</h2>
              <p>Download verified plans and price sheets for clients.</p>
            </div>
            <div className="docs-grid">
              {[
                { title: 'BMS Royal City - Master Layout & Price Chart', type: 'PDF • 4.2 MB', category: 'Plot Scheme' },
                { title: 'BMS Greens - Brochure & Amenities Guide', type: 'PDF • 8.5 MB', category: 'Villa Project' },
                { title: 'BMS Heights - Floor Plans (2 & 3 BHK)', type: 'PDF • 6.1 MB', category: 'High-Rise' },
              ].map((d, idx) => (
                <div key={idx} className="doc-card">
                  <FileText className="doc-icon" size={32} />
                  <div>
                    <h4>{d.title}</h4>
                    <p>{d.type} • <span className="blue-text">{d.category}</span></p>
                  </div>
                  <button className="btn-outline small">Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bms-footer">
        <p>© 2026 BMS Real Estates. All Rights Reserved. Jaipur, Rajasthan, India.</p>
        <p className="footer-sub">🟢 Live Supabase Database Connected (Mumbai ap-south-1) • ₹0 Cloud Active</p>
      </footer>
    </div>
  );
}