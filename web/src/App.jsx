import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';

const lazyNamed = (factory, exportName) =>
    lazy(() => factory().then((m) => ({ default: m[exportName] })));

const Dashboard = lazy(() => import('./Dashboard'));
const OperationPanel = lazyNamed(() => import('./pages/OperationPanel'), 'OperationPanel');
const StationDetails = lazyNamed(() => import('./pages/StationDetails'), 'StationDetails');
const Parameters = lazyNamed(() => import('./pages/Parameters'), 'Parameters');
const Login = lazyNamed(() => import('./pages/Login'), 'Login');
const RegisterFirst = lazyNamed(() => import('./pages/RegisterFirst'), 'RegisterFirst');
const Register = lazyNamed(() => import('./pages/Register'), 'Register');
const InverterForm = lazyNamed(() => import('./pages/InverterForm'), 'InverterForm');
const Inverters = lazyNamed(() => import('./pages/Inverters'), 'Inverters');
const Branches = lazyNamed(() => import('./pages/Branches'), 'Branches');
const BranchForm = lazyNamed(() => import('./pages/BranchForm'), 'BranchForm');
const Employees = lazyNamed(() => import('./pages/Employees'), 'Employees');
const EmployeeForm = lazyNamed(() => import('./pages/EmployeeForm'), 'EmployeeForm');
const Customers = lazyNamed(() => import('./pages/Customers'), 'Customers');
const CustomerForm = lazyNamed(() => import('./pages/CustomerForm'), 'CustomerForm');
const CustomerFormWizard = lazyNamed(() => import('./pages/CustomerFormWizard'), 'CustomerFormWizard');
const CustomerDashboardLayout = lazyNamed(() => import('./pages/CustomerDashboardLayout'), 'CustomerDashboardLayout');
const CustomerStatus = lazyNamed(() => import('./pages/CustomerStatus'), 'CustomerStatus');
const CustomerInfo = lazyNamed(() => import('./pages/CustomerInfo'), 'CustomerInfo');
const CustomerPlant = lazyNamed(() => import('./pages/CustomerPlant'), 'CustomerPlant');
const CustomerGeneration = lazyNamed(() => import('./pages/CustomerGeneration'), 'CustomerGeneration');
const CustomerInvoices = lazyNamed(() => import('./pages/CustomerInvoices'), 'CustomerInvoices');
const CustomerAlerts = lazyNamed(() => import('./pages/CustomerAlerts'), 'CustomerAlerts');
const CustomerReports = lazyNamed(() => import('./pages/CustomerReports'), 'CustomerReports');
const CustomerConsumerUnits = lazyNamed(() => import('./pages/CustomerConsumerUnits'), 'CustomerConsumerUnits');
const CustomerTickets = lazyNamed(() => import('./pages/CustomerTickets'), 'CustomerTickets');
const CustomerDocuments = lazyNamed(() => import('./pages/CustomerDocuments'), 'CustomerDocuments');
const CustomerWarranties = lazyNamed(() => import('./pages/CustomerWarranties'), 'CustomerWarranties');
const CustomerSettings = lazyNamed(() => import('./pages/CustomerSettings'), 'CustomerSettings');
const IntegratedPlants = lazyNamed(() => import('./pages/IntegratedPlants'), 'IntegratedPlants');
const MonitoringDetails = lazyNamed(() => import('./pages/MonitoringDetails'), 'MonitoringDetails');
const TicketForm = lazyNamed(() => import('./pages/TicketForm'), 'TicketForm');
const TicketList = lazyNamed(() => import('./pages/TicketList'), 'TicketList');
const TicketDetails = lazyNamed(() => import('./pages/TicketDetails'), 'TicketDetails');
const TicketKanban = lazyNamed(() => import('./pages/TicketKanban'), 'TicketKanban');
const EmployeeList = lazyNamed(() => import('./pages/Settings/EmployeeList'), 'EmployeeList');
const ReasonList = lazyNamed(() => import('./pages/Settings/ReasonList'), 'ReasonList');
const Integrations = lazyNamed(() => import('./pages/Settings/Integrations'), 'Integrations');
const AIVision = lazyNamed(() => import('./pages/AIVision'), 'AIVision');
const SuperJota = lazyNamed(() => import('./pages/SuperJota'), 'SuperJota');
const InverterComparison = lazyNamed(() => import('./pages/InverterComparison'), 'InverterComparison');

function RouteLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
    );
}

function Page({ children }) {
    return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

const MainLayoutWrapper = ({ children }) => (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-950 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
    </div>
);

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                    <BrowserRouter>
                        <Routes>
                        <Route path="/login" element={<Page><Login /></Page>} />
                        <Route path="/register-first" element={<Page><RegisterFirst /></Page>} />
                        <Route path="/register" element={<Page><Register /></Page>} />

                        {/* Super Jota - Full screen, no sidebar */}
                        <Route path="/super-jota" element={
                            <ProtectedRoute>
                                <Page><SuperJota /></Page>
                            </ProtectedRoute>
                        } />

                        {/* Customer Create/Edit Routes - MUST be before /customers/:id to avoid conflict */}
                        <Route path="/customers/new" element={
                            <ProtectedRoute>
                                <MainLayoutWrapper>
                                    <Page><CustomerForm /></Page>
                                </MainLayoutWrapper>
                            </ProtectedRoute>
                        } />
                        <Route path="/customers/edit/:id" element={
                            <ProtectedRoute>
                                <MainLayoutWrapper>
                                    <Page><CustomerForm /></Page>
                                </MainLayoutWrapper>
                            </ProtectedRoute>
                        } />

                        {/* Wizard Routes - New Multi-Step Form */}
                        <Route path="/customers/wizard/new" element={
                            <ProtectedRoute>
                                <MainLayoutWrapper>
                                    <Page><CustomerFormWizard /></Page>
                                </MainLayoutWrapper>
                            </ProtectedRoute>
                        } />
                        <Route path="/customers/wizard/edit/:id" element={
                            <ProtectedRoute>
                                <MainLayoutWrapper>
                                    <Page><CustomerFormWizard /></Page>
                                </MainLayoutWrapper>
                            </ProtectedRoute>
                        } />


                        {/* Customer Dashboard - Separate layout with its own sidebar */}
                        <Route path="/customers/:id/*" element={
                            <ProtectedRoute>
                                <Page><CustomerDashboardLayout /></Page>
                            </ProtectedRoute>
                        }>
                            <Route index element={<Page><CustomerStatus /></Page>} />
                            <Route path="status" element={<Page><CustomerStatus /></Page>} />
                            <Route path="info" element={<Page><CustomerInfo /></Page>} />
                            <Route path="plant" element={<Page><CustomerPlant /></Page>} />
                            <Route path="generation" element={<Page><CustomerGeneration /></Page>} />
                            <Route path="invoices" element={<Page><CustomerInvoices /></Page>} />
                            <Route path="alerts" element={<Page><CustomerAlerts /></Page>} />
                            <Route path="reports" element={<Page><CustomerReports /></Page>} />
                            <Route path="consumer-units" element={<Page><CustomerConsumerUnits /></Page>} />
                            <Route path="tickets" element={<Page><CustomerTickets /></Page>} />
                            <Route path="documents" element={<Page><CustomerDocuments /></Page>} />
                            <Route path="warranties" element={<Page><CustomerWarranties /></Page>} />
                            <Route path="settings" element={<Page><CustomerSettings /></Page>} />
                        </Route>

                        {/* Main App Layout */}
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <div className="flex h-screen bg-slate-50 dark:bg-gray-950 overflow-hidden">
                                        <Sidebar />
                                        <main className="flex-1 overflow-y-auto">
                                            <Routes>
                                                <Route path="/" element={<Page><Dashboard /></Page>} />
                                                <Route path="/operation" element={<Page><OperationPanel /></Page>} />
                                                <Route path="/operation/:id" element={<Page><StationDetails /></Page>} />
                                                <Route path="/station/:id" element={<Page><StationDetails /></Page>} />
                                                <Route path="/parameters" element={<Page><Parameters /></Page>} />
                                                <Route path="/inverters" element={<Page><Inverters /></Page>} />
                                                <Route path="/inverters/new" element={<Page><InverterForm /></Page>} />
                                                <Route path="/inverters/edit/:id" element={<Page><InverterForm /></Page>} />
                                                <Route path="/branches" element={<Page><Branches /></Page>} />
                                                <Route path="/branches/new" element={<Page><BranchForm /></Page>} />
                                                <Route path="/branches/edit/:id" element={<Page><BranchForm /></Page>} />
                                                <Route path="/employees" element={<Page><Employees /></Page>} />
                                                <Route path="/employees/new" element={<Page><EmployeeForm /></Page>} />
                                                <Route path="/employees/edit/:id" element={<Page><EmployeeForm /></Page>} />
                                                <Route path="/customers" element={<Page><Customers /></Page>} />

                                                <Route path="/monitoring" element={<Page><IntegratedPlants /></Page>} />
                                                <Route path="/monitoring/:id" element={<Page><MonitoringDetails /></Page>} />
                                                <Route path="/monitoring/compare/:stationId" element={<Page><InverterComparison /></Page>} />
                                                <Route path="/ai-vision" element={<Page><AIVision /></Page>} />
                                                <Route path="/tickets" element={<Page><TicketList /></Page>} />
                                                <Route path="/tickets/kanban" element={<Page><TicketKanban /></Page>} />
                                                <Route path="/tickets/new" element={<Page><TicketForm /></Page>} />
                                                <Route path="/tickets/:id" element={<Page><TicketDetails /></Page>} />
                                                <Route path="/settings/employees" element={<Page><EmployeeList /></Page>} />
                                                <Route path="/settings/reasons" element={<Page><ReasonList /></Page>} />
                                                <Route path="/settings/integrations" element={<Page><Integrations /></Page>} />
                                            </Routes>
                                        </main>
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        </Routes>
                    </BrowserRouter>
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
