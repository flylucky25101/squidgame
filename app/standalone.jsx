import React from 'react';
import {createRoot} from 'react-dom/client';
import Arena from './arena/Arena.jsx';
import LastCity from './game/LastCity';
import './globals.css';
createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).get('mode')==='city'?<LastCity/>:<Arena/>);
