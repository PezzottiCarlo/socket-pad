//load public folder and routes
const express = require('express');
const app = express();

app.use(express.static('public'));

//run on host:0.0.0.0:3000
app.listen(3000,'0.0.0.0', () => {
    console.log('Server running on 0.0.0.0:3000');
});