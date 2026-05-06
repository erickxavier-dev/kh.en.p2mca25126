import React, { useEffect, useState, useMemo } from 'react';
import { Container, Typography, AppBar, Toolbar, Box, Card, CardContent, Select, MenuItem, FormControl, InputLabel, Chip, ThemeProvider, createTheme, CssBaseline, Fade, Grow } from '@mui/material';
import { Log } from '../../logging_middleware/index.mjs';

const TYPE_WEIGHT = { Placement: 300, Result: 200, Event: 100 };

function calcScore(n) {
    const w = (TYPE_WEIGHT[n.Type] || 0) * 1e12;
    const t = new Date(n.Timestamp).getTime();
    return w + t;
}

class MinHeap {
    constructor() { this.heap = []; }
    size() { return this.heap.length; }
    peek() { return this.heap[0]; }
    push(item) {
        this.heap.push(item);
        this._up(this.heap.length - 1);
    }
    pop() {
        const top = this.heap[0];
        const tail = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = tail;
            this._down(0);
        }
        return top;
    }
    _up(i) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[p].score <= this.heap[i].score) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }
    _down(i) {
        const n = this.heap.length;
        while (true) {
            let min = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l].score < this.heap[min].score) min = l;
            if (r < n && this.heap[r].score < this.heap[min].score) min = r;
            if (min === i) break;
            [this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]];
            i = min;
        }
    }
}

function getTopN(notifications, n) {
    const heap = new MinHeap();
    for (const notif of notifications) {
        const s = calcScore(notif);
        const entry = { ...notif, score: s };
        if (heap.size() < n) {
            heap.push(entry);
        } else if (s > heap.peek().score) {
            heap.pop();
            heap.push(entry);
        }
    }
    const result = [];
    while (heap.size() > 0) result.unshift(heap.pop());
    return result;
}

// Premium Dark Theme using MUI
const premiumTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#38bdf8' },
    secondary: { main: '#a78bfa' },
    success: { main: '#34d399' },
    background: {
      default: '#0f172a',
      paper: '#1e293b'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.6)',
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'none',
        }
      }
    }
  }
});

export default function App() {
  const [data, setData] = useState({ placements: [], events: [], results: [] });
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [topN, setTopN] = useState(10);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Log('frontend', 'info', 'page', 'Dashboard loaded');

    Promise.all([
      fetch('http://localhost:3001/api/notifications/placements').then(r => r.json()),
      fetch('http://localhost:3001/api/notifications/events').then(r => r.json()),
      fetch('http://localhost:3001/api/notifications/results').then(r => r.json())
    ]).then(([placements, events, results]) => {
      setData({ placements, events, results });
      setLoaded(true);
    }).catch(err => console.error('Fetch error:', err));

    const token = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;
    if (token) {
        fetch('http://20.207.122.201/evaluation-service/notifications', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(r => r.json())
          .then(json => {
              if (json.notifications) setLiveNotifications(json.notifications);
          })
          .catch(err => console.error("Priority API fetch failed", err));
    }
  }, []);

  const priorityInbox = useMemo(() => {
      return getTopN(liveNotifications, topN);
  }, [liveNotifications, topN]);

  const getIcon = (type) => {
      if (type === 'Placement') return '💼';
      if (type === 'Event') return '📅';
      return '🎓';
  };

  return (
    <ThemeProvider theme={premiumTheme}>
      <CssBaseline />
      
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h5" sx={{ mr: 2 }}>🔔</Typography>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, background: 'linear-gradient(90deg, #38bdf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Campus Connect Hub
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 5, mb: 8 }}>
        
        {/* Priority Inbox */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" color="text.primary">
                Priority Inbox
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="top-n-label">Show Top</InputLabel>
                <Select labelId="top-n-label" value={topN} label="Show Top" onChange={(e) => setTopN(e.target.value)}>
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={15}>Top 15</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                </Select>
            </FormControl>
        </Box>

        <Grow in={true} timeout={800}>
          <Card sx={{ mb: 6, borderRadius: 4, overflow: 'hidden' }}>
              <CardContent sx={{ p: 0 }}>
                  {priorityInbox.length === 0 ? (
                      <Box p={4} textAlign="center">
                          <Typography color="text.secondary">Loading priority notifications...</Typography>
                      </Box>
                  ) : (
                      <Box display="flex" flexDirection="column">
                          {priorityInbox.map((item, index) => (
                              <Box key={item.ID} display="flex" alignItems="center" gap={3} p={2.5} 
                                   sx={{ 
                                     borderBottom: index !== priorityInbox.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                     transition: 'background 0.2s',
                                     '&:hover': { background: 'rgba(255,255,255,0.03)' }
                                   }}>
                                  
                                  <Typography variant="h5" color="text.disabled" sx={{ minWidth: '40px', textAlign: 'center', fontWeight: 'bold' }}>
                                      #{index + 1}
                                  </Typography>
                                  
                                  <Chip 
                                    icon={getIcon(item.Type)}
                                    label={item.Type} 
                                    color={item.Type === 'Placement' ? 'primary' : item.Type === 'Result' ? 'success' : 'secondary'} 
                                    variant="outlined"
                                    sx={{ minWidth: '110px', fontWeight: 'bold', borderWidth: 2 }} 
                                  />
                                  
                                  <Box flex={1}>
                                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 0.5 }}>
                                          {item.Message}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          {item.Timestamp}
                                      </Typography>
                                  </Box>
                              </Box>
                          ))}
                      </Box>
                  )}
              </CardContent>
          </Card>
        </Grow>

        <Typography variant="h4" mb={4} color="text.primary">
            Standard Feeds
        </Typography>

        <Fade in={loaded} timeout={1000}>
          <Box display="flex" gap={4} flexWrap="wrap">
            
            <Card sx={{ flex: '1 1 300px', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <Typography variant="h5" sx={{ mr: 1 }}>💼</Typography>
                  <Typography variant="h5" color="primary.main">Placements</Typography>
                </Box>
                {data.placements.length === 0 && <Typography color="text.secondary">No placement news yet.</Typography>}
                {data.placements.map(item => (
                  <Box key={item.id} mb={2.5}>
                    <Typography variant="subtitle1" fontWeight="bold">{item.company}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={0.5}>{item.role}</Typography>
                    <Typography variant="caption" color="primary.light">{item.date}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ flex: '1 1 300px', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <Typography variant="h5" sx={{ mr: 1 }}>📅</Typography>
                  <Typography variant="h5" color="secondary.main">Events</Typography>
                </Box>
                {data.events.length === 0 && <Typography color="text.secondary">No events scheduled.</Typography>}
                {data.events.map(ev => (
                  <Box key={ev.id} mb={2.5}>
                    <Typography variant="subtitle1" fontWeight="bold">{ev.name}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={0.5}>{ev.location}</Typography>
                    <Typography variant="caption" color="secondary.light">{ev.time}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ flex: '1 1 300px', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <Typography variant="h5" sx={{ mr: 1 }}>🎓</Typography>
                  <Typography variant="h5" color="success.main">Results</Typography>
                </Box>
                {data.results.length === 0 && <Typography color="text.secondary">No results published.</Typography>}
                {data.results.map(res => (
                  <Box key={res.id} mb={2.5}>
                    <Typography variant="subtitle1" fontWeight="bold">{res.sem}</Typography>
                    <Typography variant="body2" color="success.light">{res.status}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

          </Box>
        </Fade>

      </Container>
    </ThemeProvider>
  );
}
