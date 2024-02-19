import { Ability } from '@casl/ability';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router } from 'react-router-dom';
import { AbilityContext } from './components/common/Authorization';
import VersionAutoUpdater from './components/VersionAutoUpdater/VersionAutoUpdater';
import MobileRoutes from './MobileRoutes';
import { ActiveJobProvider } from './providers/ActiveJobProvider';
import { AppProvider } from './providers/AppProvider';
import MantineProvider from './providers/MantineProvider';
import ReactQueryProvider from './providers/ReactQueryProvider';
import ThirdPartyProvider from './providers/ThirdPartyServicesProvider';
import { TrackingProvider } from './providers/TrackingProvider';
import Routes from './Routes';

const defaultAbility = new Ability();

// const isMobile =
//     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
//         navigator.userAgent,
//     ) || window.innerWidth < 768;

const isMobile = window.innerWidth < 768;

const isMinimalPage = window.location.pathname.startsWith('/minimal');

const App = () => (
    <>
        <Helmet>
            <title>Lightdash</title>
        </Helmet>

        <ReactQueryProvider>
            <MantineProvider>
                <Router>
                    <AppProvider>
                        <VersionAutoUpdater />
                        <ThirdPartyProvider
                            enabled={isMobile || !isMinimalPage}
                        >
                            <TrackingProvider
                                enabled={isMobile || !isMinimalPage}
                            >
                                <AbilityContext.Provider value={defaultAbility}>
                                    <ActiveJobProvider>
                                        {isMobile ? (
                                            <MobileRoutes />
                                        ) : (
                                            <Routes />
                                        )}
                                    </ActiveJobProvider>
                                </AbilityContext.Provider>
                            </TrackingProvider>
                        </ThirdPartyProvider>
                    </AppProvider>
                </Router>
            </MantineProvider>

            <ReactQueryDevtools initialIsOpen={false} />
        </ReactQueryProvider>
    </>
);

export default App;
