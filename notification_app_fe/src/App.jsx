import React, { useEffect, useState } from 'react';
import { Container, Typography, AppBar, Toolbar, Box, Card, CardContent } from '@mui/material';
import { Log } from 'logging-middleware';

export default function App() {
  const [data, setData] = useState({ placements: [], events: [], results: [] });

  useEffect(() => {
    // Initial fetch simulation
    Log('frontend', 'info', 'api', 'Loading initial notifications for user');
    
    // Simulate API delay
    setTimeout(() => {
      setData({
        placements: [
          { id: 101, company: "Tech Solutions", role: "SDE", date: "June 2026" }
        ],
        events: [
          { id: 201, name: "Spring Fest 26", location: "Main Ground", time: "10 AM" }
        ],
        results: [
          { id: 301, sem: "Sem 5 Regular", status: "Published", url: "/res/sem5" }
        ]
      });
    }, 500);

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
              <Typography variant="h6" color="primary">Placement News</Typography>
              {data.placements.map(item => (
                <div key={item.id} style={{ marginTop: '10px' }}>
                  <strong>{item.company}</strong> - {item.role} <br/>
                  <small>{item.date}</small>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card style={{ flex: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" color="secondary">Upcoming Events</Typography>
              {data.events.map(ev => (
                <div key={ev.id} style={{ marginTop: '10px' }}>
                  <strong>{ev.name}</strong> <br/>
                  <small>{ev.time} @ {ev.location}</small>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card style={{ flex: 1, minWidth: '300px' }}>
            <CardContent>
              <Typography variant="h6" color="success.main">Exam Results</Typography>
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
