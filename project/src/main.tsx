import React from 'react';
import {createRoot} from 'react-dom/client';
import {LearningHubApp} from './features/learning-hub/LearningHub';
import {installBrowserStoragePort} from './core/persistence';
import {browserStoragePort,initializeBrowserPersistence} from './core/unified-persistence';
import './styles.css';

await initializeBrowserPersistence();
installBrowserStoragePort(browserStoragePort());
createRoot(document.getElementById('root')!).render(<React.StrictMode><LearningHubApp/></React.StrictMode>);
