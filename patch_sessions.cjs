const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Sessions.jsx');
let content = fs.readFileSync(file, 'utf8');

// Target 1: State
content = content.replace(
  '  const [retryCount, setRetryCount] = useState(0);\n\n  // States cho Hủy buổi',
  '  const [retryCount, setRetryCount] = useState(0);\n\n  const [myRequests, setMyRequests] = useState([]);\n\n  // States cho Hủy buổi'
);

// Target 2: loadSessions
const target2 = `  const loadSessions = useCallback(() => {
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

const repl2 = `  const loadSessions = useCallback(() => {
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

content = content.replace(target2, repl2);

// Target 3: renderActions start
content = content.replace(
  `    const hasOpen = sessions.some((s) => s.status?.toLowerCase() === 'open');
    const hasMakeup = session.activeMakeupCount > 0;

    const btnStyle =`,
  `    const hasOpen = sessions.some((s) => s.status?.toLowerCase() === 'open');
    const hasMakeup = session.activeMakeupCount > 0;
    const pendingCancel = myRequests.find(req => (req.classSession?.id === sId || req.classSessionId === sId) && req.cancelStatus === 'pending');
    const pendingMakeup = myRequests.find(req => (req.classSession?.id === sId || req.classSessionId === sId) && req.makeupStatus === 'pending');

    const btnStyle =`
);

// Target 4: cancelled case
const target4 = `            {!hasMakeup && !session.makeupForId ? (
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

const repl4 = `            {!hasMakeup && !session.makeupForId ? (
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

content = content.replace(target4, repl4);

// Target 5: default case
const target5 = `            <button
              className="btn btn-d btn-sm"
              style={btnStyle}
              disabled={busy || hasOpen}
              onClick={() => setCancelModalSessionId(sId)}
            >
              ❌ Hủy
            </button>
          </div>`;

const repl5 = `            {pendingCancel ? (
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

content = content.replace(target5, repl5);

fs.writeFileSync(file, content);
console.log('Sessions.jsx patched successfully.');
