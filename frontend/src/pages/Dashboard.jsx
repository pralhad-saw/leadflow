import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api, { TOKEN_KEY, errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [brokerages, setBrokerages] = useState([]);
  const [selectedBrokerageId, setSelectedBrokerageId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [clientApplication, setClientApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('passport');
  const [credentials, setCredentials] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

  const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
  const canAssign = user.role === 'brokerage_admin';
  const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

  const loadLeads = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (user.role === 'platform_admin' && selectedBrokerageId) params.brokerageId = selectedBrokerageId;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  useEffect(() => {
    if (user.role === 'client') {
      api.get('/client/application').then(({ data }) => setClientApplication(data.application)).catch(() => {});
      const refreshDocuments = () => api.get('/documents/my').then(({ data }) => setDocuments(data.documents)).catch(() => {});
      refreshDocuments();
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token: localStorage.getItem(TOKEN_KEY) },
      });
      socket.on('document:checking', refreshDocuments);
      socket.on('document:approved', refreshDocuments);
      socket.on('document:rejected', refreshDocuments);
      return () => socket.disconnect();
    }

    loadLeads();
    if (user.role === 'platform_admin') {
      api.get('/brokerages').then(({ data }) => setBrokerages(data.brokerages)).catch((err) => setError(errMsg(err)));
    }
    if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

    const token = localStorage.getItem(TOKEN_KEY);
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
    });
    const refresh = () => loadLeads();
    socket.on('lead:created', refresh);
    socket.on('lead:updated', refresh);
    socket.on('lead:stageChanged', refresh);
    socket.on('lead:assigned', refresh);
    socket.on('lead:deleted', refresh);
    socket.on('document:checking', refresh);
    socket.on('document:approved', refresh);
    socket.on('document:rejected', refresh);

    return () => socket.disconnect();
  }, [user.role, search, selectedBrokerageId]);

  const columns = useMemo(() => {
    return STAGES.reduce((result, stage) => {
      result[stage] = leads.filter((lead) => lead.stage === stage);
      return result;
    }, {});
  }, [leads]);

  const changeStage = async (id, stage) => {
    try {
      await api.patch(`/leads/${id}/stage`, { stage });
      await loadLeads();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const assignLead = async (id, assignedTo) => {
    try {
      await api.patch(`/leads/${id}/assign`, { assignedTo });
      await loadLeads();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const viewClientDocuments = async (clientId) => {
    try {
      const { data } = await api.get(`/documents/client/${clientId}`);
      setClientDocuments(data.documents);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const convertLead = async (id) => {
    if (!window.confirm('Convert this lead into a client?')) return;
    try {
      const { data } = await api.post(`/leads/${id}/convert`);
      setCredentials(data.temporaryPassword ? { email: data.client.email, password: data.temporaryPassword } : null);
      setNotice(data.existingClient ? 'Existing client linked successfully' : 'Client created successfully');
      await loadLeads();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!selectedFile) return setError('Choose a PDF, JPG or PNG file first');

    const body = new FormData();
    body.append('file', selectedFile);
    body.append('documentType', documentType);

    try {
      await api.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { data } = await api.get('/documents/my');
      setDocuments(data.documents);
      setSelectedFile(null);
      event.target.reset();
      setNotice('Document uploaded and marked Pending');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const createLead = async (event) => {
    event.preventDefault();
    try {
      await api.post('/leads', form);
      setForm({ name: '', email: '', phone: '', source: 'manual' });
      setShowForm(false);
      setNotice('Lead created successfully');
      await loadLeads();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong className="brand small-brand">LeadFlow</strong>
          <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
        </div>
        <div className="row">
          <span className="muted small">{user.email}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="content">
        <div className="board-heading">
          <div>
            <h2>Lead pipeline</h2>
            <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
          </div>
          {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
        </div>

        {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
        {notice && <div className="success">{notice}</div>}
        {clientDocuments.length > 0 && (
          <div className="card credentials">
            <strong>Client documents</strong>
            {clientDocuments.map((doc) => (
              <span key={doc._id} className="document-view-row">
                <span>{doc.originalName} · {doc.status}</span>
                <a href={doc.secureUrl} target="_blank" rel="noreferrer">View file</a>
              </span>
            ))}
          </div>
        )}
        {credentials && (
          <div className="card credentials">
            <strong>New client login</strong>
            <span>Email: {credentials.email}</span>
            <span>Temporary password: {credentials.password}</span>
            <small>Share this once with the client. A production app would use a password setup link.</small>
          </div>
        )}

        {showForm && (
          <form className="card lead-form" onSubmit={createLead}>
            <h3>New lead</h3>
            <div className="form-grid">
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <button className="btn primary" type="submit">Create lead</button>
          </form>
        )}

        {user.role === 'platform_admin' && (
          <div className="card platform-panel">
            <div>
              <strong>Platform overview</strong>
              <p className="muted small">Read-only view across brokerages. Select a brokerage to inspect its pipeline.</p>
            </div>
            <select value={selectedBrokerageId} onChange={(e) => setSelectedBrokerageId(e.target.value)}>
              <option value="">All brokerages</option>
              {brokerages.map((brokerage) => (
                <option key={brokerage._id} value={brokerage._id}>{brokerage.name} ({brokerage.slug})</option>
              ))}
            </select>
          </div>
        )}

        <div className="board-toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
          <span className="muted small">{leads.length} leads</span>
        </div>

        {user.role === 'client' ? (
          <div className="card client-portal">
            <h3>My mortgage application</h3>
            {clientApplication ? (
              <>
                <p><strong>{clientApplication.name}</strong></p>
                <p className="muted">Current stage: <strong>{clientApplication.stage}</strong></p>
                <p className="muted">Advisor: {clientApplication.assignedTo?.name || 'Not assigned yet'}</p>
                <form className="upload-box" onSubmit={uploadDocument}>
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                    <option value="passport">Passport</option>
                    <option value="salary-proof">Salary proof</option>
                    <option value="bank-statement">Bank statement</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files[0])} />
                  <button className="btn primary" type="submit">Upload document</button>
                  <small className="muted">PDF, JPG or PNG. Maximum 5 MB.</small>
                </form>
                <div className="document-list">
                  <h4>My documents</h4>
                  {documents.length === 0 && <p className="muted">No documents uploaded yet.</p>}
                  {documents.map((doc) => (
                    <div className="document-row" key={doc._id}>
                      <span><strong>{doc.originalName}</strong><small>{doc.documentType}{doc.failureReason ? ` · ${doc.failureReason}` : ''}</small></span>
                      <span className="document-actions">
                        <span className={`status status-${doc.status.toLowerCase()}`}>{doc.status}</span>
                        <a href={doc.secureUrl} target="_blank" rel="noreferrer">View file</a>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="muted">No mortgage application found yet.</p>}
          </div>
        ) : (
          <div className="kanban">
            {STAGES.map((stage) => (
              <section className="kanban-column" key={stage}>
                <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
                {columns[stage].map((lead) => (
                  <article className="lead-card" key={lead._id}>
                    <strong>{lead.name}</strong>
                    <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
                    <span className="muted small">Source: {lead.source}</span>
                    {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
                    {canManage && (
                      <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
                        {STAGES.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    )}
                    {canAssign && (
                      <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
                        <option value="">Assign advisor</option>
                        {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
                      </select>
                    )}
                    {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
                    {canManage && !lead.convertedClientId && lead.email && (
                      <button className="btn small-btn" onClick={() => convertLead(lead._id)}>Convert to client</button>
                    )}
                    {lead.convertedClientId && (
                      <>
                        <span className="converted">Client created</span>
                        <button className="btn small-btn" onClick={() => viewClientDocuments(lead.convertedClientId)}>View documents</button>
                      </>
                    )}
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
// import { useEffect, useMemo, useState } from 'react';
// import { io } from 'socket.io-client';
// import api, { TOKEN_KEY, errMsg } from '../api/axios';
// import { useAuth } from '../context/AuthContext';

// const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// export default function Dashboard() {
//   const { user, logout } = useAuth();
//   const [leads, setLeads] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [error, setError] = useState('');
//   const [notice, setNotice] = useState('');
//   const [search, setSearch] = useState('');
//   const [showForm, setShowForm] = useState(false);
//   const [clientApplication, setClientApplication] = useState(null);
//   const [documents, setDocuments] = useState([]);
//   const [clientDocuments, setClientDocuments] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [documentType, setDocumentType] = useState('passport');
//   const [credentials, setCredentials] = useState(null);
//   const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

//   const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
//   const canAssign = user.role === 'brokerage_admin';
//   const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

//   const loadLeads = async () => {
//     try {
//       const { data } = await api.get('/leads', { params: search ? { search } : {} });
//       setLeads(data.leads);
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   useEffect(() => {
//     if (user.role === 'client') {
//       api.get('/client/application').then(({ data }) => setClientApplication(data.application)).catch(() => {});
//       const refreshDocuments = () => api.get('/documents/my').then(({ data }) => setDocuments(data.documents)).catch(() => {});
//       refreshDocuments();
//       const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
//         auth: { token: localStorage.getItem(TOKEN_KEY) },
//       });
//       socket.on('document:checking', refreshDocuments);
//       socket.on('document:approved', refreshDocuments);
//       socket.on('document:rejected', refreshDocuments);
//       return () => socket.disconnect();
//     }

//     loadLeads();
//     if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

//     const token = localStorage.getItem(TOKEN_KEY);
//     const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
//       auth: { token },
//     });
//     const refresh = () => loadLeads();
//     socket.on('lead:created', refresh);
//     socket.on('lead:updated', refresh);
//     socket.on('lead:stageChanged', refresh);
//     socket.on('lead:assigned', refresh);
//     socket.on('lead:deleted', refresh);
//     socket.on('document:checking', refresh);
//     socket.on('document:approved', refresh);
//     socket.on('document:rejected', refresh);

//     return () => socket.disconnect();
//   }, [user.role, search]);

//   const columns = useMemo(() => {
//     return STAGES.reduce((result, stage) => {
//       result[stage] = leads.filter((lead) => lead.stage === stage);
//       return result;
//     }, {});
//   }, [leads]);

//   const changeStage = async (id, stage) => {
//     try {
//       await api.patch(`/leads/${id}/stage`, { stage });
//       await loadLeads();
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   const assignLead = async (id, assignedTo) => {
//     try {
//       await api.patch(`/leads/${id}/assign`, { assignedTo });
//       await loadLeads();
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   const viewClientDocuments = async (clientId) => {
//     try {
//       const { data } = await api.get(`/documents/client/${clientId}`);
//       setClientDocuments(data.documents);
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   const convertLead = async (id) => {
//     if (!window.confirm('Convert this lead into a client?')) return;
//     try {
//       const { data } = await api.post(`/leads/${id}/convert`);
//       setCredentials(data.temporaryPassword ? { email: data.client.email, password: data.temporaryPassword } : null);
//       setNotice(data.existingClient ? 'Existing client linked successfully' : 'Client created successfully');
//       await loadLeads();
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   const uploadDocument = async (event) => {
//     event.preventDefault();
//     if (!selectedFile) return setError('Choose a PDF, JPG or PNG file first');

//     const body = new FormData();
//     body.append('file', selectedFile);
//     body.append('documentType', documentType);

//     try {
//       await api.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data' } });
//       const { data } = await api.get('/documents/my');
//       setDocuments(data.documents);
//       setSelectedFile(null);
//       event.target.reset();
//       setNotice('Document uploaded and marked Pending');
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   const createLead = async (event) => {
//     event.preventDefault();
//     try {
//       await api.post('/leads', form);
//       setForm({ name: '', email: '', phone: '', source: 'manual' });
//       setShowForm(false);
//       setNotice('Lead created successfully');
//       await loadLeads();
//     } catch (err) {
//       setError(errMsg(err));
//     }
//   };

//   return (
//     <div className="page">
//       <header className="topbar">
//         <div>
//           <strong className="brand small-brand">LeadFlow</strong>
//           <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
//         </div>
//         <div className="row">
//           <span className="muted small">{user.email}</span>
//           <button className="btn ghost" onClick={logout}>Log out</button>
//         </div>
//       </header>

//       <main className="content">
//         <div className="board-heading">
//           <div>
//             <h2>Lead pipeline</h2>
//             <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
//           </div>
//           {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
//         </div>

//         {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
//         {notice && <div className="success">{notice}</div>}
//         {clientDocuments.length > 0 && (
//           <div className="card credentials">
//             <strong>Client documents</strong>
//             {clientDocuments.map((doc) => (
//               <span key={doc._id} className="document-view-row">
//                 <span>{doc.originalName} · {doc.status}</span>
//                 <a href={doc.secureUrl} target="_blank" rel="noreferrer">View file</a>
//               </span>
//             ))}
//           </div>
//         )}
//         {credentials && (
//           <div className="card credentials">
//             <strong>New client login</strong>
//             <span>Email: {credentials.email}</span>
//             <span>Temporary password: {credentials.password}</span>
//             <small>Share this once with the client. A production app would use a password setup link.</small>
//           </div>
//         )}

//         {showForm && (
//           <form className="card lead-form" onSubmit={createLead}>
//             <h3>New lead</h3>
//             <div className="form-grid">
//               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
//               <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
//               <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
//               <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
//             </div>
//             <button className="btn primary" type="submit">Create lead</button>
//           </form>
//         )}

//         <div className="board-toolbar">
//           <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
//           <span className="muted small">{leads.length} leads</span>
//         </div>

//         {user.role === 'client' ? (
//           <div className="card client-portal">
//             <h3>My mortgage application</h3>
//             {clientApplication ? (
//               <>
//                 <p><strong>{clientApplication.name}</strong></p>
//                 <p className="muted">Current stage: <strong>{clientApplication.stage}</strong></p>
//                 <p className="muted">Advisor: {clientApplication.assignedTo?.name || 'Not assigned yet'}</p>
//                 <form className="upload-box" onSubmit={uploadDocument}>
//                   <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
//                     <option value="passport">Passport</option>
//                     <option value="salary-proof">Salary proof</option>
//                     <option value="bank-statement">Bank statement</option>
//                     <option value="other">Other</option>
//                   </select>
//                   <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files[0])} />
//                   <button className="btn primary" type="submit">Upload document</button>
//                   <small className="muted">PDF, JPG or PNG. Maximum 5 MB.</small>
//                 </form>
//                 <div className="document-list">
//                   <h4>My documents</h4>
//                   {documents.length === 0 && <p className="muted">No documents uploaded yet.</p>}
//                   {documents.map((doc) => (
//                     <div className="document-row" key={doc._id}>
//                       <span><strong>{doc.originalName}</strong><small>{doc.documentType}{doc.failureReason ? ` · ${doc.failureReason}` : ''}</small></span>
//                       <span className="document-actions">
//                         <span className={`status status-${doc.status.toLowerCase()}`}>{doc.status}</span>
//                         <a href={doc.secureUrl} target="_blank" rel="noreferrer">View file</a>
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </>
//             ) : <p className="muted">No mortgage application found yet.</p>}
//           </div>
//         ) : (
//           <div className="kanban">
//             {STAGES.map((stage) => (
//               <section className="kanban-column" key={stage}>
//                 <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
//                 {columns[stage].map((lead) => (
//                   <article className="lead-card" key={lead._id}>
//                     <strong>{lead.name}</strong>
//                     <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
//                     <span className="muted small">Source: {lead.source}</span>
//                     {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
//                     {canManage && (
//                       <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
//                         {STAGES.map((option) => <option key={option}>{option}</option>)}
//                       </select>
//                     )}
//                     {canAssign && (
//                       <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
//                         <option value="">Assign advisor</option>
//                         {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
//                       </select>
//                     )}
//                     {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
//                     {canManage && !lead.convertedClientId && lead.email && (
//                       <button className="btn small-btn" onClick={() => convertLead(lead._id)}>Convert to client</button>
//                     )}
//                     {lead.convertedClientId && (
//                       <>
//                         <span className="converted">Client created</span>
//                         <button className="btn small-btn" onClick={() => viewClientDocuments(lead.convertedClientId)}>View documents</button>
//                       </>
//                     )}
//                   </article>
//                 ))}
//               </section>
//             ))}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }
// // import { useEffect, useMemo, useState } from 'react';
// // import { io } from 'socket.io-client';
// // import api, { TOKEN_KEY, errMsg } from '../api/axios';
// // import { useAuth } from '../context/AuthContext';

// // const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// // export default function Dashboard() {
// //   const { user, logout } = useAuth();
// //   const [leads, setLeads] = useState([]);
// //   const [users, setUsers] = useState([]);
// //   const [error, setError] = useState('');
// //   const [notice, setNotice] = useState('');
// //   const [search, setSearch] = useState('');
// //   const [showForm, setShowForm] = useState(false);
// //   const [clientApplication, setClientApplication] = useState(null);
// //   const [documents, setDocuments] = useState([]);
// //   const [clientDocuments, setClientDocuments] = useState([]);
// //   const [selectedFile, setSelectedFile] = useState(null);
// //   const [documentType, setDocumentType] = useState('passport');
// //   const [credentials, setCredentials] = useState(null);
// //   const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

// //   const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
// //   const canAssign = user.role === 'brokerage_admin';
// //   const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

// //   const loadLeads = async () => {
// //     try {
// //       const { data } = await api.get('/leads', { params: search ? { search } : {} });
// //       setLeads(data.leads);
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   useEffect(() => {
// //     if (user.role === 'client') {
// //       api.get('/client/application').then(({ data }) => setClientApplication(data.application)).catch(() => {});
// //       const refreshDocuments = () => api.get('/documents/my').then(({ data }) => setDocuments(data.documents)).catch(() => {});
// //       refreshDocuments();
// //       const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
// //         auth: { token: localStorage.getItem(TOKEN_KEY) },
// //       });
// //       socket.on('document:checking', refreshDocuments);
// //       socket.on('document:approved', refreshDocuments);
// //       socket.on('document:rejected', refreshDocuments);
// //       return () => socket.disconnect();
// //     }

// //     loadLeads();
// //     if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

// //     const token = localStorage.getItem(TOKEN_KEY);
// //     const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
// //       auth: { token },
// //     });
// //     const refresh = () => loadLeads();
// //     socket.on('lead:created', refresh);
// //     socket.on('lead:updated', refresh);
// //     socket.on('lead:stageChanged', refresh);
// //     socket.on('lead:assigned', refresh);
// //     socket.on('lead:deleted', refresh);
// //     socket.on('document:checking', refresh);
// //     socket.on('document:approved', refresh);
// //     socket.on('document:rejected', refresh);

// //     return () => socket.disconnect();
// //   }, [user.role, search]);

// //   const columns = useMemo(() => {
// //     return STAGES.reduce((result, stage) => {
// //       result[stage] = leads.filter((lead) => lead.stage === stage);
// //       return result;
// //     }, {});
// //   }, [leads]);

// //   const changeStage = async (id, stage) => {
// //     try {
// //       await api.patch(`/leads/${id}/stage`, { stage });
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const assignLead = async (id, assignedTo) => {
// //     try {
// //       await api.patch(`/leads/${id}/assign`, { assignedTo });
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const viewClientDocuments = async (clientId) => {
// //     try {
// //       const { data } = await api.get(`/documents/client/${clientId}`);
// //       setClientDocuments(data.documents);
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const convertLead = async (id) => {
// //     if (!window.confirm('Convert this lead into a client?')) return;
// //     try {
// //       const { data } = await api.post(`/leads/${id}/convert`);
// //       setCredentials(data.temporaryPassword ? { email: data.client.email, password: data.temporaryPassword } : null);
// //       setNotice(data.existingClient ? 'Existing client linked successfully' : 'Client created successfully');
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const uploadDocument = async (event) => {
// //     event.preventDefault();
// //     if (!selectedFile) return setError('Choose a PDF, JPG or PNG file first');

// //     const body = new FormData();
// //     body.append('file', selectedFile);
// //     body.append('documentType', documentType);

// //     try {
// //       await api.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data' } });
// //       const { data } = await api.get('/documents/my');
// //       setDocuments(data.documents);
// //       setSelectedFile(null);
// //       event.target.reset();
// //       setNotice('Document uploaded and marked Pending');
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const createLead = async (event) => {
// //     event.preventDefault();
// //     try {
// //       await api.post('/leads', form);
// //       setForm({ name: '', email: '', phone: '', source: 'manual' });
// //       setShowForm(false);
// //       setNotice('Lead created successfully');
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   return (
// //     <div className="page">
// //       <header className="topbar">
// //         <div>
// //           <strong className="brand small-brand">LeadFlow</strong>
// //           <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
// //         </div>
// //         <div className="row">
// //           <span className="muted small">{user.email}</span>
// //           <button className="btn ghost" onClick={logout}>Log out</button>
// //         </div>
// //       </header>

// //       <main className="content">
// //         <div className="board-heading">
// //           <div>
// //             <h2>Lead pipeline</h2>
// //             <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
// //           </div>
// //           {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
// //         </div>

// //         {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
// //         {notice && <div className="success">{notice}</div>}
// //         {clientDocuments.length > 0 && (
// //           <div className="card credentials">
// //             <strong>Client documents</strong>
// //             {clientDocuments.map((doc) => <span key={doc._id}>{doc.originalName} · {doc.status}</span>)}
// //           </div>
// //         )}
// //         {credentials && (
// //           <div className="card credentials">
// //             <strong>New client login</strong>
// //             <span>Email: {credentials.email}</span>
// //             <span>Temporary password: {credentials.password}</span>
// //             <small>Share this once with the client. A production app would use a password setup link.</small>
// //           </div>
// //         )}

// //         {showForm && (
// //           <form className="card lead-form" onSubmit={createLead}>
// //             <h3>New lead</h3>
// //             <div className="form-grid">
// //               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
// //               <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
// //               <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
// //               <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
// //             </div>
// //             <button className="btn primary" type="submit">Create lead</button>
// //           </form>
// //         )}

// //         <div className="board-toolbar">
// //           <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
// //           <span className="muted small">{leads.length} leads</span>
// //         </div>

// //         {user.role === 'client' ? (
// //           <div className="card client-portal">
// //             <h3>My mortgage application</h3>
// //             {clientApplication ? (
// //               <>
// //                 <p><strong>{clientApplication.name}</strong></p>
// //                 <p className="muted">Current stage: <strong>{clientApplication.stage}</strong></p>
// //                 <p className="muted">Advisor: {clientApplication.assignedTo?.name || 'Not assigned yet'}</p>
// //                 <form className="upload-box" onSubmit={uploadDocument}>
// //                   <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
// //                     <option value="passport">Passport</option>
// //                     <option value="salary-proof">Salary proof</option>
// //                     <option value="bank-statement">Bank statement</option>
// //                     <option value="other">Other</option>
// //                   </select>
// //                   <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files[0])} />
// //                   <button className="btn primary" type="submit">Upload document</button>
// //                   <small className="muted">PDF, JPG or PNG. Maximum 5 MB.</small>
// //                 </form>
// //                 <div className="document-list">
// //                   <h4>My documents</h4>
// //                   {documents.length === 0 && <p className="muted">No documents uploaded yet.</p>}
// //                   {documents.map((doc) => (
// //                     <div className="document-row" key={doc._id}>
// //                       <span><strong>{doc.originalName}</strong><small>{doc.documentType}{doc.failureReason ? ` · ${doc.failureReason}` : ''}</small></span>
// //                       <span className={`status status-${doc.status.toLowerCase()}`}>{doc.status}</span>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </>
// //             ) : <p className="muted">No mortgage application found yet.</p>}
// //           </div>
// //         ) : (
// //           <div className="kanban">
// //             {STAGES.map((stage) => (
// //               <section className="kanban-column" key={stage}>
// //                 <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
// //                 {columns[stage].map((lead) => (
// //                   <article className="lead-card" key={lead._id}>
// //                     <strong>{lead.name}</strong>
// //                     <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
// //                     <span className="muted small">Source: {lead.source}</span>
// //                     {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
// //                     {canManage && (
// //                       <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
// //                         {STAGES.map((option) => <option key={option}>{option}</option>)}
// //                       </select>
// //                     )}
// //                     {canAssign && (
// //                       <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
// //                         <option value="">Assign advisor</option>
// //                         {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
// //                       </select>
// //                     )}
// //                     {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
// //                     {canManage && !lead.convertedClientId && lead.email && (
// //                       <button className="btn small-btn" onClick={() => convertLead(lead._id)}>Convert to client</button>
// //                     )}
// //                     {lead.convertedClientId && (
// //                       <>
// //                         <span className="converted">Client created</span>
// //                         <button className="btn small-btn" onClick={() => viewClientDocuments(lead.convertedClientId)}>View documents</button>
// //                       </>
// //                     )}
// //                   </article>
// //                 ))}
// //               </section>
// //             ))}
// //           </div>
// //         )}
// //       </main>
// //     </div>
// //   );
// // }

// // import { useEffect, useMemo, useState } from 'react';
// // import { io } from 'socket.io-client';
// // import api, { TOKEN_KEY, errMsg } from '../api/axios';
// // import { useAuth } from '../context/AuthContext';

// // const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// // export default function Dashboard() {
// //   const { user, logout } = useAuth();
// //   const [leads, setLeads] = useState([]);
// //   const [users, setUsers] = useState([]);
// //   const [error, setError] = useState('');
// //   const [notice, setNotice] = useState('');
// //   const [search, setSearch] = useState('');
// //   const [showForm, setShowForm] = useState(false);
// //   const [clientApplication, setClientApplication] = useState(null);
// //   const [documents, setDocuments] = useState([]);
// //   const [clientDocuments, setClientDocuments] = useState([]);
// //   const [selectedFile, setSelectedFile] = useState(null);
// //   const [documentType, setDocumentType] = useState('passport');
// //   const [credentials, setCredentials] = useState(null);
// //   const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

// //   const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
// //   const canAssign = user.role === 'brokerage_admin';
// //   const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

// //   const loadLeads = async () => {
// //     try {
// //       const { data } = await api.get('/leads', { params: search ? { search } : {} });
// //       setLeads(data.leads);
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   useEffect(() => {
// //     if (user.role === 'client') {
// //       api.get('/client/application').then(({ data }) => setClientApplication(data.application)).catch(() => {});
// //       api.get('/documents/my').then(({ data }) => setDocuments(data.documents)).catch(() => {});
// //       return undefined;
// //     }

// //     loadLeads();
// //     if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

// //     const token = localStorage.getItem(TOKEN_KEY);
// //     const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
// //       auth: { token },
// //     });
// //     const refresh = () => loadLeads();
// //     socket.on('lead:created', refresh);
// //     socket.on('lead:updated', refresh);
// //     socket.on('lead:stageChanged', refresh);
// //     socket.on('lead:assigned', refresh);
// //     socket.on('lead:deleted', refresh);

// //     return () => socket.disconnect();
// //   }, [user.role, search]);

// //   const columns = useMemo(() => {
// //     return STAGES.reduce((result, stage) => {
// //       result[stage] = leads.filter((lead) => lead.stage === stage);
// //       return result;
// //     }, {});
// //   }, [leads]);

// //   const changeStage = async (id, stage) => {
// //     try {
// //       await api.patch(`/leads/${id}/stage`, { stage });
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const assignLead = async (id, assignedTo) => {
// //     try {
// //       await api.patch(`/leads/${id}/assign`, { assignedTo });
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const viewClientDocuments = async (clientId) => {
// //     try {
// //       const { data } = await api.get(`/documents/client/${clientId}`);
// //       setClientDocuments(data.documents);
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const convertLead = async (id) => {
// //     if (!window.confirm('Convert this lead into a client?')) return;
// //     try {
// //       const { data } = await api.post(`/leads/${id}/convert`);
// //       setCredentials(data.temporaryPassword ? { email: data.client.email, password: data.temporaryPassword } : null);
// //       setNotice(data.existingClient ? 'Existing client linked successfully' : 'Client created successfully');
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const uploadDocument = async (event) => {
// //     event.preventDefault();
// //     if (!selectedFile) return setError('Choose a PDF, JPG or PNG file first');

// //     const body = new FormData();
// //     body.append('file', selectedFile);
// //     body.append('documentType', documentType);

// //     try {
// //       await api.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data' } });
// //       const { data } = await api.get('/documents/my');
// //       setDocuments(data.documents);
// //       setSelectedFile(null);
// //       event.target.reset();
// //       setNotice('Document uploaded and marked Pending');
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   const createLead = async (event) => {
// //     event.preventDefault();
// //     try {
// //       await api.post('/leads', form);
// //       setForm({ name: '', email: '', phone: '', source: 'manual' });
// //       setShowForm(false);
// //       setNotice('Lead created successfully');
// //       await loadLeads();
// //     } catch (err) {
// //       setError(errMsg(err));
// //     }
// //   };

// //   return (
// //     <div className="page">
// //       <header className="topbar">
// //         <div>
// //           <strong className="brand small-brand">LeadFlow</strong>
// //           <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
// //         </div>
// //         <div className="row">
// //           <span className="muted small">{user.email}</span>
// //           <button className="btn ghost" onClick={logout}>Log out</button>
// //         </div>
// //       </header>

// //       <main className="content">
// //         <div className="board-heading">
// //           <div>
// //             <h2>Lead pipeline</h2>
// //             <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
// //           </div>
// //           {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
// //         </div>

// //         {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
// //         {notice && <div className="success">{notice}</div>}
// //         {clientDocuments.length > 0 && (
// //           <div className="card credentials">
// //             <strong>Client documents</strong>
// //             {clientDocuments.map((doc) => <span key={doc._id}>{doc.originalName} · {doc.status}</span>)}
// //           </div>
// //         )}
// //         {credentials && (
// //           <div className="card credentials">
// //             <strong>New client login</strong>
// //             <span>Email: {credentials.email}</span>
// //             <span>Temporary password: {credentials.password}</span>
// //             <small>Share this once with the client. A production app would use a password setup link.</small>
// //           </div>
// //         )}

// //         {showForm && (
// //           <form className="card lead-form" onSubmit={createLead}>
// //             <h3>New lead</h3>
// //             <div className="form-grid">
// //               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
// //               <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
// //               <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
// //               <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
// //             </div>
// //             <button className="btn primary" type="submit">Create lead</button>
// //           </form>
// //         )}

// //         <div className="board-toolbar">
// //           <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
// //           <span className="muted small">{leads.length} leads</span>
// //         </div>

// //         {user.role === 'client' ? (
// //           <div className="card client-portal">
// //             <h3>My mortgage application</h3>
// //             {clientApplication ? (
// //               <>
// //                 <p><strong>{clientApplication.name}</strong></p>
// //                 <p className="muted">Current stage: <strong>{clientApplication.stage}</strong></p>
// //                 <p className="muted">Advisor: {clientApplication.assignedTo?.name || 'Not assigned yet'}</p>
// //                 <form className="upload-box" onSubmit={uploadDocument}>
// //                   <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
// //                     <option value="passport">Passport</option>
// //                     <option value="salary-proof">Salary proof</option>
// //                     <option value="bank-statement">Bank statement</option>
// //                     <option value="other">Other</option>
// //                   </select>
// //                   <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files[0])} />
// //                   <button className="btn primary" type="submit">Upload document</button>
// //                   <small className="muted">PDF, JPG or PNG. Maximum 5 MB.</small>
// //                 </form>
// //                 <div className="document-list">
// //                   <h4>My documents</h4>
// //                   {documents.length === 0 && <p className="muted">No documents uploaded yet.</p>}
// //                   {documents.map((doc) => (
// //                     <div className="document-row" key={doc._id}>
// //                       <span><strong>{doc.originalName}</strong><small>{doc.documentType}</small></span>
// //                       <span className={`status status-${doc.status.toLowerCase()}`}>{doc.status}</span>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </>
// //             ) : <p className="muted">No mortgage application found yet.</p>}
// //           </div>
// //         ) : (
// //           <div className="kanban">
// //             {STAGES.map((stage) => (
// //               <section className="kanban-column" key={stage}>
// //                 <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
// //                 {columns[stage].map((lead) => (
// //                   <article className="lead-card" key={lead._id}>
// //                     <strong>{lead.name}</strong>
// //                     <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
// //                     <span className="muted small">Source: {lead.source}</span>
// //                     {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
// //                     {canManage && (
// //                       <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
// //                         {STAGES.map((option) => <option key={option}>{option}</option>)}
// //                       </select>
// //                     )}
// //                     {canAssign && (
// //                       <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
// //                         <option value="">Assign advisor</option>
// //                         {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
// //                       </select>
// //                     )}
// //                     {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
// //                     {canManage && !lead.convertedClientId && lead.email && (
// //                       <button className="btn small-btn" onClick={() => convertLead(lead._id)}>Convert to client</button>
// //                     )}
// //                     {lead.convertedClientId && (
// //                       <>
// //                         <span className="converted">Client created</span>
// //                         <button className="btn small-btn" onClick={() => viewClientDocuments(lead.convertedClientId)}>View documents</button>
// //                       </>
// //                     )}
// //                   </article>
// //                 ))}
// //               </section>
// //             ))}
// //           </div>
// //         )}
// //       </main>
// //     </div>
// //   );
// // }


// // // import { useEffect, useMemo, useState } from 'react';
// // // import { io } from 'socket.io-client';
// // // import api, { TOKEN_KEY, errMsg } from '../api/axios';
// // // import { useAuth } from '../context/AuthContext';

// // // const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// // // export default function Dashboard() {
// // //   const { user, logout } = useAuth();
// // //   const [leads, setLeads] = useState([]);
// // //   const [users, setUsers] = useState([]);
// // //   const [error, setError] = useState('');
// // //   const [notice, setNotice] = useState('');
// // //   const [search, setSearch] = useState('');
// // //   const [showForm, setShowForm] = useState(false);
// // //   const [clientApplication, setClientApplication] = useState(null);
// // //   const [credentials, setCredentials] = useState(null);
// // //   const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

// // //   const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
// // //   const canAssign = user.role === 'brokerage_admin';
// // //   const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

// // //   const loadLeads = async () => {
// // //     try {
// // //       const { data } = await api.get('/leads', { params: search ? { search } : {} });
// // //       setLeads(data.leads);
// // //     } catch (err) {
// // //       setError(errMsg(err));
// // //     }
// // //   };

// // //   useEffect(() => {
// // //     if (user.role === 'client') {
// // //       api.get('/client/application').then(({ data }) => setClientApplication(data.application)).catch(() => {});
// // //       return undefined;
// // //     }

// // //     loadLeads();
// // //     if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

// // //     const token = localStorage.getItem(TOKEN_KEY);
// // //     const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
// // //       auth: { token },
// // //     });
// // //     const refresh = () => loadLeads();
// // //     socket.on('lead:created', refresh);
// // //     socket.on('lead:updated', refresh);
// // //     socket.on('lead:stageChanged', refresh);
// // //     socket.on('lead:assigned', refresh);
// // //     socket.on('lead:deleted', refresh);

// // //     return () => socket.disconnect();
// // //   }, [user.role, search]);

// // //   const columns = useMemo(() => {
// // //     return STAGES.reduce((result, stage) => {
// // //       result[stage] = leads.filter((lead) => lead.stage === stage);
// // //       return result;
// // //     }, {});
// // //   }, [leads]);

// // //   const changeStage = async (id, stage) => {
// // //     try {
// // //       await api.patch(`/leads/${id}/stage`, { stage });
// // //       await loadLeads();
// // //     } catch (err) {
// // //       setError(errMsg(err));
// // //     }
// // //   };

// // //   const assignLead = async (id, assignedTo) => {
// // //     try {
// // //       await api.patch(`/leads/${id}/assign`, { assignedTo });
// // //       await loadLeads();
// // //     } catch (err) {
// // //       setError(errMsg(err));
// // //     }
// // //   };

// // //   const convertLead = async (id) => {
// // //     if (!window.confirm('Convert this lead into a client?')) return;
// // //     try {
// // //       const { data } = await api.post(`/leads/${id}/convert`);
// // //       setCredentials(data.temporaryPassword ? { email: data.client.email, password: data.temporaryPassword } : null);
// // //       setNotice(data.existingClient ? 'Existing client linked successfully' : 'Client created successfully');
// // //       await loadLeads();
// // //     } catch (err) {
// // //       setError(errMsg(err));
// // //     }
// // //   };

// // //   const createLead = async (event) => {
// // //     event.preventDefault();
// // //     try {
// // //       await api.post('/leads', form);
// // //       setForm({ name: '', email: '', phone: '', source: 'manual' });
// // //       setShowForm(false);
// // //       setNotice('Lead created successfully');
// // //       await loadLeads();
// // //     } catch (err) {
// // //       setError(errMsg(err));
// // //     }
// // //   };

// // //   return (
// // //     <div className="page">
// // //       <header className="topbar">
// // //         <div>
// // //           <strong className="brand small-brand">LeadFlow</strong>
// // //           <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
// // //         </div>
// // //         <div className="row">
// // //           <span className="muted small">{user.email}</span>
// // //           <button className="btn ghost" onClick={logout}>Log out</button>
// // //         </div>
// // //       </header>

// // //       <main className="content">
// // //         <div className="board-heading">
// // //           <div>
// // //             <h2>Lead pipeline</h2>
// // //             <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
// // //           </div>
// // //           {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
// // //         </div>

// // //         {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
// // //         {notice && <div className="success">{notice}</div>}
// // //         {credentials && (
// // //           <div className="card credentials">
// // //             <strong>New client login</strong>
// // //             <span>Email: {credentials.email}</span>
// // //             <span>Temporary password: {credentials.password}</span>
// // //             <small>Share this once with the client. A production app would use a password setup link.</small>
// // //           </div>
// // //         )}

// // //         {showForm && (
// // //           <form className="card lead-form" onSubmit={createLead}>
// // //             <h3>New lead</h3>
// // //             <div className="form-grid">
// // //               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
// // //               <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
// // //               <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
// // //               <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
// // //             </div>
// // //             <button className="btn primary" type="submit">Create lead</button>
// // //           </form>
// // //         )}

// // //         <div className="board-toolbar">
// // //           <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
// // //           <span className="muted small">{leads.length} leads</span>
// // //         </div>

// // //         {user.role === 'client' ? (
// // //           <div className="card client-portal">
// // //             <h3>My mortgage application</h3>
// // //             {clientApplication ? (
// // //               <>
// // //                 <p><strong>{clientApplication.name}</strong></p>
// // //                 <p className="muted">Current stage: <strong>{clientApplication.stage}</strong></p>
// // //                 <p className="muted">Advisor: {clientApplication.assignedTo?.name || 'Not assigned yet'}</p>
// // //                 <div className="document-placeholder">Document upload will be available here next.</div>
// // //               </>
// // //             ) : <p className="muted">No mortgage application found yet.</p>}
// // //           </div>
// // //         ) : (
// // //           <div className="kanban">
// // //             {STAGES.map((stage) => (
// // //               <section className="kanban-column" key={stage}>
// // //                 <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
// // //                 {columns[stage].map((lead) => (
// // //                   <article className="lead-card" key={lead._id}>
// // //                     <strong>{lead.name}</strong>
// // //                     <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
// // //                     <span className="muted small">Source: {lead.source}</span>
// // //                     {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
// // //                     {canManage && (
// // //                       <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
// // //                         {STAGES.map((option) => <option key={option}>{option}</option>)}
// // //                       </select>
// // //                     )}
// // //                     {canAssign && (
// // //                       <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
// // //                         <option value="">Assign advisor</option>
// // //                         {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
// // //                       </select>
// // //                     )}
// // //                     {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
// // //                     {canManage && !lead.convertedClientId && lead.email && (
// // //                       <button className="btn small-btn" onClick={() => convertLead(lead._id)}>Convert to client</button>
// // //                     )}
// // //                     {lead.convertedClientId && <span className="converted">Client created</span>}
// // //                   </article>
// // //                 ))}
// // //               </section>
// // //             ))}
// // //           </div>
// // //         )}
// // //       </main>
// // //     </div>
// // //   );
// // // }

// // // // // import { useEffect, useState } from 'react';
// // // // // import api, { errMsg } from '../api/axios';
// // // // // import { useAuth } from '../context/AuthContext';

// // // // // /**
// // // // //  * Day 2 placeholder. Its real job right now is to PROVE tenant isolation:
// // // // //  * log in as Berlin vs Munich and the user list changes, even though both call
// // // // //  * the exact same endpoint with no brokerageId anywhere in the request.
// // // // //  */
// // // // // export default function Dashboard() {
// // // // //   const { user, logout } = useAuth();
// // // // //   const [users, setUsers] = useState([]);
// // // // //   const [brokerage, setBrokerage] = useState(null);
// // // // //   const [error, setError] = useState('');

// // // // //   useEffect(() => {
// // // // //     api.get('/users').then(({ data }) => setUsers(data.users)).catch((e) => setError(errMsg(e)));
// // // // //     if (user.role !== 'platform_admin') {
// // // // //       api.get('/brokerages/me').then(({ data }) => setBrokerage(data.brokerage)).catch(() => {});
// // // // //     }
// // // // //   }, [user.role]);

// // // // //   return (
// // // // //     <div className="page">
// // // // //       <header className="topbar">
// // // // //         <div>
// // // // //           <strong className="brand small-brand">LeadFlow</strong>
// // // // //           <span className="muted" style={{ marginLeft: 10 }}>
// // // // //             {brokerage ? brokerage.name : 'Platform'}
// // // // //           </span>
// // // // //         </div>
// // // // //         <div className="row">
// // // // //           <span className="badge">{user.role}</span>
// // // // //           <span className="muted small">{user.email}</span>
// // // // //           <button className="btn ghost" onClick={logout}>Log out</button>
// // // // //         </div>
// // // // //       </header>

// // // // //       <main className="content">
// // // // //         <h2>Welcome, {user.name}</h2>
// // // // //         <p className="muted">
// // // // //           Tenant id: <code>{user.brokerageId || 'none (platform admin)'}</code>
// // // // //         </p>

// // // // //         {error && <div className="alert">{error}</div>}

// // // // //         <div className="card" style={{ marginTop: 20 }}>
// // // // //           <h3>Users visible to you ({users.length})</h3>
// // // // //           <p className="muted small">
// // // // //             Scoped server-side from the session -- the request sends no brokerage id.
// // // // //           </p>
// // // // //           <table className="table">
// // // // //             <thead>
// // // // //               <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th></tr>
// // // // //             </thead>
// // // // //             <tbody>
// // // // //               {users.map((u) => (
// // // // //                 <tr key={u.id}>
// // // // //                   <td>{u.name}</td>
// // // // //                   <td>{u.email}</td>
// // // // //                   <td><span className="badge">{u.role}</span></td>
// // // // //                   <td>{u.isActive ? 'yes' : 'no'}</td>
// // // // //                 </tr>
// // // // //               ))}
// // // // //             </tbody>
// // // // //           </table>
// // // // //         </div>
// // // // //       </main>
// // // // //     </div>
// // // // //   );
// // // // // }
// // // // import { useEffect, useMemo, useState } from 'react';
// // // // import { io } from 'socket.io-client';
// // // // import api, { TOKEN_KEY, errMsg } from '../api/axios';
// // // // import { useAuth } from '../context/AuthContext';

// // // // const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// // // // export default function Dashboard() {
// // // //   const { user, logout } = useAuth();
// // // //   const [leads, setLeads] = useState([]);
// // // //   const [users, setUsers] = useState([]);
// // // //   const [error, setError] = useState('');
// // // //   const [notice, setNotice] = useState('');
// // // //   const [search, setSearch] = useState('');
// // // //   const [showForm, setShowForm] = useState(false);
// // // //   const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });

// // // //   const canManage = user.role === 'brokerage_admin' || user.role === 'advisor';
// // // //   const canAssign = user.role === 'brokerage_admin';
// // // //   const advisors = users.filter((item) => item.role === 'advisor' && item.isActive);

// // // //   const loadLeads = async () => {
// // // //     try {
// // // //       const { data } = await api.get('/leads', { params: search ? { search } : {} });
// // // //       setLeads(data.leads);
// // // //     } catch (err) {
// // // //       setError(errMsg(err));
// // // //     }
// // // //   };

// // // //   useEffect(() => {
// // // //     if (user.role === 'client') return undefined;

// // // //     loadLeads();
// // // //     if (canManage) api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});

// // // //     const token = localStorage.getItem(TOKEN_KEY);
// // // //     const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
// // // //       auth: { token },
// // // //     });
// // // //     const refresh = () => loadLeads();
// // // //     socket.on('lead:created', refresh);
// // // //     socket.on('lead:updated', refresh);
// // // //     socket.on('lead:stageChanged', refresh);
// // // //     socket.on('lead:assigned', refresh);
// // // //     socket.on('lead:deleted', refresh);

// // // //     return () => socket.disconnect();
// // // //   }, [user.role, search]);

// // // //   const columns = useMemo(() => {
// // // //     return STAGES.reduce((result, stage) => {
// // // //       result[stage] = leads.filter((lead) => lead.stage === stage);
// // // //       return result;
// // // //     }, {});
// // // //   }, [leads]);

// // // //   const changeStage = async (id, stage) => {
// // // //     try {
// // // //       await api.patch(`/leads/${id}/stage`, { stage });
// // // //       await loadLeads();
// // // //     } catch (err) {
// // // //       setError(errMsg(err));
// // // //     }
// // // //   };

// // // //   const assignLead = async (id, assignedTo) => {
// // // //     try {
// // // //       await api.patch(`/leads/${id}/assign`, { assignedTo });
// // // //       await loadLeads();
// // // //     } catch (err) {
// // // //       setError(errMsg(err));
// // // //     }
// // // //   };

// // // //   const createLead = async (event) => {
// // // //     event.preventDefault();
// // // //     try {
// // // //       await api.post('/leads', form);
// // // //       setForm({ name: '', email: '', phone: '', source: 'manual' });
// // // //       setShowForm(false);
// // // //       setNotice('Lead created successfully');
// // // //       await loadLeads();
// // // //     } catch (err) {
// // // //       setError(errMsg(err));
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="page">
// // // //       <header className="topbar">
// // // //         <div>
// // // //           <strong className="brand small-brand">LeadFlow</strong>
// // // //           <span className="muted" style={{ marginLeft: 10 }}>{user.role}</span>
// // // //         </div>
// // // //         <div className="row">
// // // //           <span className="muted small">{user.email}</span>
// // // //           <button className="btn ghost" onClick={logout}>Log out</button>
// // // //         </div>
// // // //       </header>

// // // //       <main className="content">
// // // //         <div className="board-heading">
// // // //           <div>
// // // //             <h2>Lead pipeline</h2>
// // // //             <p className="muted">Welcome, {user.name}. This board is scoped to your brokerage.</p>
// // // //           </div>
// // // //           {canManage && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Add lead</button>}
// // // //         </div>

// // // //         {error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}
// // // //         {notice && <div className="success">{notice}</div>}

// // // //         {showForm && (
// // // //           <form className="card lead-form" onSubmit={createLead}>
// // // //             <h3>New lead</h3>
// // // //             <div className="form-grid">
// // // //               <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
// // // //               <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
// // // //               <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
// // // //               <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
// // // //             </div>
// // // //             <button className="btn primary" type="submit">Create lead</button>
// // // //           </form>
// // // //         )}

// // // //         <div className="board-toolbar">
// // // //           <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" />
// // // //           <span className="muted small">{leads.length} leads</span>
// // // //         </div>

// // // //         {user.role === 'client' ? (
// // // //           <div className="card"><h3>Client portal</h3><p className="muted">Your document portal will be available after lead conversion.</p></div>
// // // //         ) : (
// // // //           <div className="kanban">
// // // //             {STAGES.map((stage) => (
// // // //               <section className="kanban-column" key={stage}>
// // // //                 <div className="column-title"><strong>{stage}</strong><span>{columns[stage].length}</span></div>
// // // //                 {columns[stage].map((lead) => (
// // // //                   <article className="lead-card" key={lead._id}>
// // // //                     <strong>{lead.name}</strong>
// // // //                     <span className="muted small">{lead.email || lead.phone || 'No contact'}</span>
// // // //                     <span className="muted small">Source: {lead.source}</span>
// // // //                     {lead.isDuplicate && <span className="duplicate">Possible duplicate</span>}
// // // //                     {canManage && (
// // // //                       <select value={lead.stage} onChange={(e) => changeStage(lead._id, e.target.value)}>
// // // //                         {STAGES.map((option) => <option key={option}>{option}</option>)}
// // // //                       </select>
// // // //                     )}
// // // //                     {canAssign && (
// // // //                       <select value={lead.assignedTo?._id || ''} onChange={(e) => assignLead(lead._id, e.target.value)}>
// // // //                         <option value="">Assign advisor</option>
// // // //                         {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.name}</option>)}
// // // //                       </select>
// // // //                     )}
// // // //                     {lead.assignedTo && <span className="muted small">Assigned: {lead.assignedTo.name}</span>}
// // // //                   </article>
// // // //                 ))}
// // // //               </section>
// // // //             ))}
// // // //           </div>
// // // //         )}
// // // //       </main>
// // // //     </div>
// // // //   );
// // // // }

