import React, { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Container, Typography, AppBar, Toolbar, Box, Card, CardContent, 
  Select, MenuItem, FormControl, InputLabel, Chip, ThemeProvider, 
  createTheme, CssBaseline, Button, Pagination, Badge 
} from '@mui/material';
import { Log } from '../../logging_middleware/index.mjs';

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#757575' },
    background: { default: '#f4f6f8', paper: '#ffffff' },
    divider: '#e0e0e0',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e0e0e0',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#333333',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
        }
      }
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none' } }
    }
  }
});

const weights = { Placement: 300, Result: 200, Event: 100 };

function getNotifScore(n) {
    let w = (weights[n.Type] || 0) * 1e12;
    return w + new Date(n.Timestamp).getTime();
}

class PrioQueue {
    constructor() { this.items = []; }
    size() { return this.items.length; }
    peek() { return this.items[0]; }
    push(item) {
        this.items.push(item);
        let i = this.items.length - 1;
        while (i > 0) {
            let p = Math.floor((i - 1) / 2);
            if (this.items[p].score <= this.items[i].score) break;
            [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
            i = p;
        }
    }
    pop() {
        const top = this.items[0];
        const tail = this.items.pop();
        if (this.items.length > 0) {
            this.items[0] = tail;
            let i = 0;
            const n = this.items.length;
            while (true) {
                let min = i;
                const l = 2 * i + 1, r = 2 * i + 2;
                if (l < n && this.items[l].score < this.items[min].score) min = l;
                if (r < n && this.items[r].score < this.items[min].score) min = r;
                if (min === i) break;
                [this.items[min], this.items[i]] = [this.items[i], this.items[min]];
                i = min;
            }
        }
        return top;
    }
}

function computeTopN(list, limit) {
    const q = new PrioQueue();
    for (const x of list) {
        const entry = { ...x, score: getNotifScore(x) };
        if (q.size() < limit) {
            q.push(entry);
        } else if (entry.score > q.peek().score) {
            q.pop();
            q.push(entry);
        }
    }
    const out = [];
    while (q.size() > 0) out.unshift(q.pop());
    return out;
}

function Navigation() {
  const loc = useLocation();
  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#1976d2' }}>
          Campus Connect
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component={Link} to="/" color={loc.pathname === '/' ? 'primary' : 'inherit'} variant={loc.pathname === '/' ? 'contained' : 'text'} disableElevation>
            Priority Inbox
          </Button>
          <Button component={Link} to="/all" color={loc.pathname === '/all' ? 'primary' : 'inherit'} variant={loc.pathname === '/all' ? 'contained' : 'text'} disableElevation>
            All Notifications
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function useViews() {
  const [reads, setReads] = useState(() => {
    let s = localStorage.getItem('seen_notifs');
    return s ? JSON.parse(s) : [];
  });

  const doRead = (id) => {
    if (!reads.includes(id)) {
      let nx = [...reads, id];
      setReads(nx);
      localStorage.setItem('seen_notifs', JSON.stringify(nx));
    }
  };
  return { reads, doRead };
}

function PriorityView({ reads, doRead }) {
  const [live, setLive] = useState([]);
  const [limit, setLimit] = useState(10);
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Log('frontend', 'info', 'page', 'Priority Inbox Loaded');
    let t = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;
    
    fetch('/evaluation-service/notifications', { headers: { 'Authorization': 'Bearer ' + t } })
      .then(res => res.json())
      .then(d => {
          if (d.notifications) setLive(d.notifications);
          setIsLoading(false);
      })
      .catch(e => {
          Log('frontend', 'error', 'api', `Priority API fetch failed: ${e.message}`);
          setIsLoading(false);
      });
  }, []);

  const toShow = useMemo(() => {
      let arr = live;
      if (filterType !== 'All') arr = arr.filter(n => n.Type === filterType);
      return computeTopN(arr, limit);
  }, [live, limit, filterType]);

  const colorMap = { Placement: 'primary', Result: 'success', Event: 'default' };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" color="text.primary">Priority Inbox</Typography>
          <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'background.paper' }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value)}>
                      <MenuItem value="All">All Types</MenuItem>
                      <MenuItem value="Placement">Placement</MenuItem>
                      <MenuItem value="Result">Result</MenuItem>
                      <MenuItem value="Event">Event</MenuItem>
                  </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'background.paper' }}>
                  <InputLabel>Show Top</InputLabel>
                  <Select value={limit} label="Show Top" onChange={e => setLimit(e.target.value)}>
                      <MenuItem value={5}>Top 5</MenuItem>
                      <MenuItem value={10}>Top 10</MenuItem>
                      <MenuItem value={15}>Top 15</MenuItem>
                      <MenuItem value={20}>Top 20</MenuItem>
                  </Select>
              </FormControl>
          </Box>
      </Box>

      <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {isLoading ? (
                  <Box p={4} textAlign="center"><Typography color="text.secondary">Loading priority notifications...</Typography></Box>
              ) : toShow.length === 0 ? (
                  <Box p={4} textAlign="center"><Typography color="text.secondary">No priority notifications found.</Typography></Box>
              ) : (
                  <Box display="flex" flexDirection="column">
                      {toShow.map((it, idx) => {
                          const fresh = !reads.includes(it.ID);
                          return (
                            <Box key={it.ID} display="flex" alignItems="center" gap={3} p={2.5} onClick={() => doRead(it.ID)} sx={{ 
                                borderBottom: '1px solid #e0e0e0',
                                backgroundColor: fresh ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' }
                              }}>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: '30px', fontWeight: 'bold' }}>#{idx + 1}</Typography>
                                <Chip label={it.Type} color={colorMap[it.Type] || 'default'} size="small" sx={{ minWidth: '90px', borderRadius: '4px', fontWeight: 500 }} />
                                <Box flex={1}>
                                    <Badge color="error" variant="dot" invisible={!fresh} sx={{ '& .MuiBadge-badge': { right: -10, top: 5 } }}>
                                      <Typography variant="body1" sx={{ fontWeight: fresh ? 600 : 400 }}>{it.Message}</Typography>
                                    </Badge>
                                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{it.Timestamp}</Typography>
                                </Box>
                            </Box>
                          );
                      })}
                  </Box>
              )}
          </CardContent>
      </Card>
    </Box>
  );
}

function FeedView({ reads, doRead }) {
  const [items, setItems] = useState([]);
  const [pg, setPg] = useState(1);
  const [limit] = useState(10);
  const [fType, setFType] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    setIsLoading(true);
    let t = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;
    
    let path = `/evaluation-service/notifications?page=${pg}&limit=${limit}`;
    if (fType) path += `&notification_type=${fType}`;

    fetch(path, { headers: { 'Authorization': 'Bearer ' + t } })
      .then(res => res.json())
      .then(d => {
          if (d.notifications) setItems(d.notifications);
          setIsLoading(false);
      })
      .catch(e => {
          Log('frontend', 'error', 'api', `API fetch failed: ${e.message}`);
          setIsLoading(false);
      });
  };

  useEffect(() => {
    Log('frontend', 'info', 'page', 'All Notifications Loaded');
    loadData();
    // eslint-disable-next-line
  }, [pg, fType]);

  const colors = { Placement: 'primary', Result: 'success', Event: 'default' };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" color="text.primary">All Notifications</Typography>
          <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'background.paper' }}>
              <InputLabel>Filter by Type</InputLabel>
              <Select value={fType} label="Filter by Type" onChange={e => { setFType(e.target.value); setPg(1); }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Placement">Placement</MenuItem>
                  <MenuItem value="Result">Result</MenuItem>
                  <MenuItem value="Event">Event</MenuItem>
              </Select>
          </FormControl>
      </Box>

      <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {isLoading ? (
                  <Box p={4} textAlign="center"><Typography color="text.secondary">Loading notifications...</Typography></Box>
              ) : items.length === 0 ? (
                  <Box p={4} textAlign="center"><Typography color="text.secondary">No notifications found.</Typography></Box>
              ) : (
                  <Box display="flex" flexDirection="column">
                      {items.map(it => {
                          let fresh = !reads.includes(it.ID);
                          return (
                            <Box key={it.ID} display="flex" alignItems="center" gap={3} p={2.5} onClick={() => doRead(it.ID)} sx={{ 
                                borderBottom: '1px solid #e0e0e0',
                                backgroundColor: fresh ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' }
                              }}>
                                <Chip label={it.Type} color={colors[it.Type] || 'default'} size="small" sx={{ minWidth: '90px', borderRadius: '4px', fontWeight: 500 }} />
                                <Box flex={1}>
                                    <Badge color="error" variant="dot" invisible={!fresh} sx={{ '& .MuiBadge-badge': { right: -10, top: 5 } }}>
                                      <Typography variant="body1" sx={{ fontWeight: fresh ? 600 : 400 }}>{it.Message}</Typography>
                                    </Badge>
                                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{it.Timestamp}</Typography>
                                </Box>
                            </Box>
                          );
                      })}
                  </Box>
              )}
          </CardContent>
      </Card>
      
      {items.length > 0 && (
        <Box display="flex" justifyContent="center" mb={4}>
          <Pagination count={10} page={pg} onChange={(e, val) => setPg(val)} color="primary" />
        </Box>
      )}
    </Box>
  );
}

export default function App() {
  const { reads, doRead } = useViews();

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Navigation />
        <Container maxWidth="md" sx={{ mt: 5, mb: 8 }}>
          <Routes>
            <Route path="/" element={<PriorityView reads={reads} doRead={doRead} />} />
            <Route path="/all" element={<FeedView reads={reads} doRead={doRead} />} />
          </Routes>
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}
