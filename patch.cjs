const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Sessions.jsx');
let content = fs.readFileSync(file, 'utf8');

// target 1
const t1 = `  const [retryCount, setRetryCount] = useState(0);

  // States cho Hủy buổi`;
const r1 = `  const [retryCount, setRetryCount] = useState(0);

  const [myRequests, setMyRequests] = useState([]);

  // States cho Hủy buổi`;
content = content.replace(t1, r1);

// target 2
const t2 = `  const loadSessions = useCallback(() => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true);
    setError(null);
    api.get('/api/v1/sessions', {
      params: { adminClassId: selectedClass.id, subjectId: selectedSubject.id }
    })
      .then(({ data }) => {
        const list = data.result ?? data.data ?? data;
        setSessions(list);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject, retryCount]);`;

const r2 = `  const loadSessions = useCallback(() => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/api/v1/sessions', { params: { adminClassId: selectedClass.id, subjectId: selectedSubject.id } }),
      api.get('/api/v1/session-requests/my-requests')
    ])
      .then(([sessionRes, requestRes]) => {
        const list = sessionRes.data?.result ?? sessionRes.data?.data ?? sessionRes.data ?? [];
        setSessions(list);
        const reqList = requestRes.data?.result ?? requestRes.data?.data ?? requestRes.data ?? [];
        setMyRequests(reqList);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject, retryCount]);`;
content = content.replace(t2, r2);

// target 3
const t3 = `    const hasOpen = sessions.some((s) => s.status?.toLowerCase() === 'open');
    const hasMakeup = session.activeMakeupCount > 0;

    const btnStyle = { width: '100px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px' };`;
const r3 = `    const hasOpen = sessions.some((s) => s.status?.toLowerCase() === 'open');
    const hasMakeup = session.activeMakeupCount > 0;
    const pendingCancel = myRequests.find(req => (req.classSession?.id === sId || req.classSessionId === sId) && req.cancelStatus === 'pending');
    const pendingMakeup = myRequests.find(req => (req.classSession?.id === sId || req.classSessionId === sId) && req.makeupStatus === 'pending');

    const btnStyle = { width: '100px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '4px' };`;
content = content.replace(t3, r3);

// target 4
const t4 = `            {!hasMakeup && !session.makeupForId ? (
              <button 
                className="btn btn-a btn-sm" 
                style={btnStyle}
                onClick={() => {
                  setMakeupModalSessionId(sId);
                  setMakeupForm({
                    sessionDate: session.sessionDate || "",
                    periodStart: session.periodStart || 1,
                    periodEnd: session.periodEnd || 3,
                    roomId: ""
                  });
                }}
              >
                📅 Dạy bù
              </button>
            ) : (`;
const r4 = `            {!hasMakeup && !session.makeupForId ? (
              pendingMakeup ? (
                <span style={{ color: '#F59E0B', fontSize: '11px', fontStyle: 'italic', lineHeight: '24px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⏳ Chờ duyệt bù
                </span>
              ) : (
                <button 
                  className="btn btn-a btn-sm" 
                  style={btnStyle}
                  onClick={() => {
                    setMakeupModalSessionId(sId);
                    setMakeupForm({
                      sessionDate: session.sessionDate || "",
                      periodStart: session.periodStart || 1,
                      periodEnd: session.periodEnd || 3,
                      roomId: ""
                    });
                  }}
                >
                  📅 Dạy bù
                </button>
              )
            ) : (`;
content = content.replace(t4, r4);

// target 5
const t5 = `            <button
              className="btn btn-d btn-sm"
              style={btnStyle}
              disabled={busy || hasOpen}
              onClick={() => setCancelModalSessionId(sId)}
            >
              ❌ Hủy
            </button>
          </div>`;
const r5 = `            {pendingCancel ? (
              <span style={{ color: '#F59E0B', fontSize: '11px', fontStyle: 'italic', lineHeight: '24px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⏳ Chờ duyệt hủy
              </span>
            ) : (
              <button
                className="btn btn-d btn-sm"
                style={btnStyle}
                disabled={busy || hasOpen}
                onClick={() => setCancelModalSessionId(sId)}
              >
                ❌ Hủy
              </button>
            )}
          </div>`;
content = content.replace(t5, r5);

fs.writeFileSync(file, content);
console.log('Patch complete. File length:', content.length);
