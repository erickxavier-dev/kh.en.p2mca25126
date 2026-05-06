import React, { useEffect, useState } from 'react';
import { Container, Typography, AppBar, Toolbar, Box, Card, CardContent } from '@mui/material';
import { Log } from '../../logging_middleware/index.mjs';

export default function App() {
  const [data, setData] = useState({ placements: [], events: [], results: [] });

  useEffect(() => {
    Log('frontend', 'info', 'page', 'Dashboard loaded');

    // fetch all three in parallel
    Promise.all([
      fetch('http://localhost:3001/api/notifications/placements').then(r => r.json()),
      fetch('http://localhost:3001/api/notifications/events').then(r => r.json()),
      fetch('http://localhost:3001/api/notifications/results').then(r => r.json())
    ]).then(([placements, events, results]) => {
      setData({ placements, events, results });
      Log('frontend', 'info', 'api', 'Notification data loaded successfully');
    }).catch(err => {
      Log('frontend', 'error', 'api', 'Failed to load notifications: ' + err.message);
      console.error('Fetch error:', err);
    });
  }, []);

  return (
    <div>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6">Campus Alerts</Typography>
        </Toolbar>
      </AppBar>

      <Container style={{ marginTop: '30px' }}>
        <Typography variant="h4" mb={3}>Your Updates</Typography>

        <Box display="flex" gap={3} flexWrap="wrap">

          <Card style={{ flex: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" color="primary">Placements</Typography>
              {data.placements.length === 0 && <p>No placement news yet.</p>}
              {data.placements.map(item => (
                <div key={item.id} style={{ marginTop: '10px' }}>
                  <strong>{item.company}</strong> — {item.role}<br />
                  <small>{item.date}</small>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card style={{ flex: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" color="secondary">Events</Typography>
              {data.events.length === 0 && <p>No events scheduled.</p>}
              {data.events.map(ev => (
                <div key={ev.id} style={{ marginTop: '10px' }}>
                  <strong>{ev.name}</strong><br />
                  <small>{ev.time} @ {ev.location}</small>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card style={{ flex: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" color="success.main">Results</Typography>
              {data.results.length === 0 && <p>No results published.</p>}
              {data.results.map(res => (
                <div key={res.id} style={{ marginTop: '10px' }}>
                  <strong>{res.sem}</strong>: {res.status}
                </div>
              ))}
            </CardContent>
          </Card>

        </Box>
      </Container>
    </div>
  );
}
