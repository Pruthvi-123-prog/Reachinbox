import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import DashboardWithCharts from '../pages/Dashboard/DashboardWithCharts';
import DashboardRedesigned from '../pages/Dashboard/DashboardRedesigned';
import EmailList from '../pages/EmailList/EmailList';
import EmailListRedesigned from '../pages/EmailList/EmailListRedesigned';
import EmailDetail from '../pages/EmailDetail/EmailDetail';
import Search from '../pages/Search/Search';
import Settings from '../pages/Settings/Settings';
import NotFound from '../pages/NotFound/NotFound';
import DesignSystemSimple from '../pages/DesignSystemSimple';
import ExamplePage from '../pages/ExamplePage';
import AppLayout from '../App';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardRedesigned />} />
        <Route path="emails" element={<EmailListRedesigned />} />
        <Route path="emails/:id" element={<EmailDetail />} />
        <Route path="search" element={<Search />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/design-system" element={<DesignSystemSimple />} />
      <Route path="/example" element={<ExamplePage />} />
    </Routes>
  );
};

export default AppRouter;
