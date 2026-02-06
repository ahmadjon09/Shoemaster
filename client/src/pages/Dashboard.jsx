import { useState, useEffect, useContext, useRef } from 'react';
import useSWR from 'swr';
import {
    Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Area, ComposedChart, Line
} from 'recharts';
import {
    TrendingUp, DollarSign, ShoppingCart,
    Package, Activity, Calendar, BarChart3,
    PieChart as PieChartIcon, Target, Award,
    Clock, RefreshCw, Filter, Download,
    ChevronUp, ChevronDown, TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    ShoppingCart as CartIcon, Tag, ShoppingBag,
    BarChart as BarChartIcon, LineChart as LineChartIcon,
    X, Database, AlertCircle,
    CheckCircle,
    Zap, Globe, Cpu, Shield, TrendingUp as Growth,
    Server
} from 'lucide-react';

import Fetch from "../middlewares/fetcher";
import { ContextData } from '../contextData/Context';
import PdfExportButton from '../components/PdfExportButton';

// Tarjimalar
const categories = [
    { value: 'Ёзги', label: 'Ёзги', color: "#38da17" },
    { value: 'Баҳор-кузги', label: 'Баҳор-кузги', color: "#f585ff" },
    { value: 'Қишги', label: 'Қишги', color: "#0b84f5" },
];

// Vaqt oraliklari tarjimasi
const timeRanges = [
    { key: 'daily', label: 'Кунлик', icon: Calendar, description: 'Сўнгги 30 кун' },
    { key: 'weekly', label: 'Ҳафталик', icon: BarChart3, description: 'Сўнгги 12 ҳафта' },
    { key: 'monthly', label: 'Ойлик', icon: TrendingUp, description: 'Сўнгги 12 ой' },
    { key: 'yearly', label: 'Йиллик', icon: Target, description: 'Сўнгги 5 йил' }
];

// Order statuslar
const orderStatuses = {
    pending: { label: 'Кутилмоқда', color: '#F59E0B', bg: '#FEF3C7' },
    processing: { label: 'Жараёнда', color: '#3B82F6', bg: '#DBEAFE' },
    completed: { label: 'Якунланган', color: '#10B981', bg: '#D1FAE5' },
    cancelled: { label: 'Бекор қилинган', color: '#EF4444', bg: '#FEE2E2' }
};

// Asosiy Dashboard komponenti
export default function DashboardPage() {
    const { pingms } = useContext(ContextData)
    const [timeRange, setTimeRange] = useState('monthly');
    const [activeChart, setActiveChart] = useState('revenue');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const dashboardRef = useRef(null);

    // Barcha API so'rovlarini yuklash
    const { data: dashboardData, mutate: mutateDashboard, isLoading: dashboardLoading } = useSWR(
        '/stats/dashboard',
        Fetch,
        {
            refreshInterval: 60000,
            revalidateOnFocus: true,
            dedupingInterval: 30000
        }
    );

    const { data: widgetsData, isLoading: widgetsLoading } = useSWR(
        '/stats/widgets',
        Fetch,
        {
            refreshInterval: 30000
        }
    );

    const { data: trendData, isLoading: trendDataLoading } = useSWR(
        `/stats/trend?interval=${timeRange}&limit=${timeRange === 'yearly' ? 5 : timeRange === 'monthly' ? 12 : 30}`,
        Fetch
    );

    const { data: categoryData, isLoading: categoryDataLoading } = useSWR(
        '/stats/category',
        Fetch
    );

    const { data: monthlyData, isLoading: monthlyDataLoading } = useSWR(
        '/stats/monthly?limit=12',
        Fetch
    );

    const { data: productStats, isLoading: productStatsLoading } = useSWR(
        '/stats/products?limit=5&sortBy=sold&sortOrder=desc',
        Fetch
    );

    const { data: realtimeData, isLoading: realtimeDataLoading } = useSWR(
        '/stats/realtime',
        Fetch,
        {
            refreshInterval: 10000,
            revalidateOnReconnect: true
        }
    );

    // Format number function
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        const number = parseFloat(num);
        if (isNaN(number)) return '0';
        return new Intl.NumberFormat('uz-UZ').format(Math.round(number));
    };

    // Format price function
    const formatPrice = (price) => {
        if (price === null || price === undefined) return '0 сум';
        const number = parseFloat(price);
        if (isNaN(number)) return '0 сум';
        return new Intl.NumberFormat('uz-UZ', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number) + ' сум';
    };

    // Format time function
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get category label and color
    const getCategoryInfo = (categoryKey) => {
        const found = categories.find(cat => cat.value === categoryKey);
        return {
            label: found ? found.label : categoryKey,
            color: found ? found.color : '#6B7280'
        };
    };

    // Trend indicator component
    const TrendIndicator = ({ change, size = 'sm' }) => {
        if (!change || change.change === undefined) return null;

        const isPositive = change.trend === 'up';
        const iconClass = isPositive ? 'text-green-600' : 'text-red-600';
        const bgClass = isPositive ? 'bg-green-100' : 'bg-red-100';
        const textSize = size === 'lg' ? 'text-base' : 'text-xs';

        return (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${bgClass} ${iconClass}`}>
                {isPositive ? (
                    <ChevronUp className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
                <span className={`font-semibold ${textSize}`}>{change.change}%</span>
            </div>
        );
    };

    // Statistik kartalar
    const StatCard = ({
        title,
        value,
        icon,
        change,
        prefix = '',
        suffix = '',
        loading = false,
        bgColor = 'bg-blue-50',
        iconColor = 'text-blue-600',
        size = 'md'
    }) => (
        <div className={`bg-white rounded-2xl shadow-sm p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover:border-blue-200`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${loading ? 'animate-pulse bg-gray-200' : bgColor}`}>
                    {loading ? (
                        <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    ) : (
                        <div className={iconColor}>{icon}</div>
                    )}
                </div>
                {!loading && change && <TrendIndicator change={change} />}
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <p className={`font-bold text-gray-900 ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
                    {prefix}{formatNumber(value)}{suffix}
                </p>
            )}
        </div>
    );

    // Mini stat card
    const MiniStatCard = ({ title, value, icon, change, color = 'blue' }) => {
        const colors = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
            green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-600' },
            purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-600' },
            orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-600' },
            red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-600' }
        };

        const colorSet = colors[color] || colors.blue;

        return (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${colorSet.bg}`}>
                        <div className={colorSet.icon}>{icon}</div>
                    </div>
                    {change && <TrendIndicator change={change} size="sm" />}
                </div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">{title}</h4>
                <p className={`text-lg font-bold ${colorSet.text}`}>
                    {formatNumber(value)}
                </p>
            </div>
        );
    };

    // Loading holatlari
    const isLoading = dashboardLoading || widgetsLoading;
    const isTrendLoading = trendDataLoading;
    const isRealtimeLoading = realtimeDataLoading;

    // Dashboard ma'lumotlarini olish
    const stats = dashboardData?.data?.data || {};
    const widgets = widgetsData?.data?.data || {};
    const trend = trendData?.data?.data || [];
    const categoriesData = categoryData?.data?.data || [];
    const monthlyStats = monthlyData?.data?.data || [];
    const products = productStats?.data?.data || [];
    const realtime = realtimeData?.data?.data || {};

    // Current time
    const currentTime = new Date().toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Yangilash funksiyasi
    const handleRefresh = async () => {
        await mutateDashboard();
        setRefreshKey(prev => prev + 1);
    };

    // Time range o'zgarganda
    useEffect(() => {
        // Data yangilash logikasi
    }, [timeRange]);

    // Dashboard metrics
    const dashboardMetrics = [
        {
            key: 'revenue',
            label: 'Даромад',
            value: stats.today?.totalRevenue || 0,
            change: stats.changes?.todayVsYesterday?.revenue,
            icon: <DollarSign className="w-6 h-6" />,
            color: 'blue',
            description: 'Бугунги даромад'
        },
        {
            key: 'orders',
            label: 'Буюртмалар',
            value: stats.today?.orderCount || 0,
            change: stats.changes?.todayVsYesterday?.orders,
            icon: <ShoppingCart className="w-6 h-6" />,
            color: 'green',
            description: 'Бугунги буюртмалар'
        },
        {
            key: 'sold',
            label: 'Сотилди',
            value: stats.today?.totalSold || 0,
            change: stats.changes?.todayVsYesterday?.sold,
            icon: <Package className="w-6 h-6" />,
            color: 'purple',
            description: 'Бугун сотилган маҳсулотлар'
        },
        {
            key: 'avgOrder',
            label: 'Уртача буюртма',
            value: stats.today?.orderCount ? (stats.today.totalRevenue / stats.today.orderCount) : 0,
            change: null,
            icon: <Activity className="w-6 h-6" />,
            color: 'orange',
            description: 'Бир буюртманинг ўртача қиймати'
        }
    ];

    // Additional metrics
    const additionalMetrics = [
        {
            key: 'weeklyRevenue',
            label: 'Ҳафталик даромад',
            value: widgets.weekly?.revenue || 0,
            icon: <BarChart3 className="w-5 h-5" />,
            color: 'blue'
        },
        {
            key: 'monthlyRevenue',
            label: 'Ойлик даромад',
            value: widgets.monthly?.revenue || 0,
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'green'
        },
        {
            key: 'yearlyRevenue',
            label: 'Йиллик даромад',
            value: widgets.yearly?.revenue || 0,
            icon: <Target className="w-5 h-5" />,
            color: 'purple'
        },
        {
            key: 'totalProducts',
            label: 'Жами маҳсулот',
            value: widgets.products?.totalProducts || 0,
            icon: <Database className="w-5 h-5" />,
            color: 'orange'
        },
        {
            key: 'inStock',
            label: 'Омборда',
            value: widgets.products?.inStock || 0,
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'green'
        },
        {
            key: 'outOfStock',
            label: 'Тугаган',
            value: widgets.products?.outOfStock || 0,
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
        }
    ];

    // System status
    const systemStatus = [
        { label: 'Сервер', status: 'online', value: '96.9%', icon: <Cpu className="w-4 h-4" /> },
        { label: 'База', status: 'online', value: '100%', icon: <Database className="w-4 h-4" /> },
        { label: 'Тармоқ', status: 'online', value: '93.5%', icon: <Globe className="w-4 h-4" /> },
        { label: 'Хавфсизлик', status: 'online', value: '98.7%', icon: <Shield className="w-4 h-4" /> }
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
                <div className="animate-pulse">
                    {/* Header loading */}
                    <div className="mb-8">
                        <div className="h-10 w-64 bg-gray-200 rounded mb-4"></div>
                        <div className="h-6 w-80 bg-gray-200 rounded"></div>
                    </div>

                    {/* Stats cards loading */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6">
                                <div className="h-12 w-12 bg-gray-200 rounded-xl mb-4"></div>
                                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 w-32 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>

                    {/* Charts loading */}
                    <div className="bg-white rounded-2xl p-6 mb-8">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }
    const pdfData = {
        dashboardData,
        widgetsData,
        trendData,
        categoryData,
        monthlyData,
        productStats,
        realtimeData
    };

    return (
        <div
            ref={dashboardRef} // ✅ FAQAT BU QO'SHILADI
            className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6"
        >
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div>
                        <div className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                                <BarChartIcon className="h-6 w-6 text-white" />
                            </div>
                            Дашбоард Панели
                        </div>
                        <div className="text-gray-600 mt-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Маълумотлар {currentTime} да янгиланди
                            <span className="flex items-center gap-1 ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                Онлайн
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0">
                        <PdfExportButton
                            dashboardData={pdfData}
                            fileName={`dashboard-report-${new Date().toISOString().split('T')[0]}`}
                            title="Дашбоард Статистика Хисоботи"
                        />
                    </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {timeRanges.map(({ key, label, icon: Icon, description }) => (
                        <button
                            key={key}
                            onClick={() => setTimeRange(key)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${timeRange === key
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                            title={description}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Asosiy statistik kartalar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {dashboardMetrics.map((metric) => (
                    <StatCard
                        key={metric.key}
                        title={metric.label}
                        value={metric.value}
                        icon={metric.icon}
                        change={metric.change}
                        suffix={metric.key === 'revenue' || metric.key === 'avgOrder' ? ' сум' : ''}
                        bgColor={`bg-${metric.color}-50`}
                        iconColor={`text-${metric.color}-600`}
                        loading={dashboardLoading}
                    />
                ))}
            </div>

            {/* Qo'shimcha statistikalar */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {additionalMetrics.map((metric) => (
                    <MiniStatCard
                        key={metric.key}
                        title={metric.label}
                        value={metric.value}
                        icon={metric.icon}
                        color={metric.color}
                    />
                ))}
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {timeRange === 'daily' && 'Кунлик сотишлар тенденцияси'}
                                {timeRange === 'weekly' && 'Ҳафталик сотишлар тенденцияси'}
                                {timeRange === 'monthly' && 'Ойлик сотишлар тенденцияси'}
                                {timeRange === 'yearly' && 'Йиллик сотишлар тенденцияси'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {timeRange === 'daily' && 'Сўнгги 30 кундаги сотишлар'}
                                {timeRange === 'weekly' && 'Сўнгги 12 ҳафтадаги сотишлар'}
                                {timeRange === 'monthly' && 'Сўнгги 12 ойдаги сотишлар'}
                                {timeRange === 'yearly' && 'Сўнгги 5 йилдаги сотишлар'}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                            <button
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${activeChart === 'revenue' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                onClick={() => setActiveChart('revenue')}
                            >
                                <TrendingUpIcon className="w-4 h-4" />
                                Даромад
                            </button>
                            <button
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${activeChart === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                onClick={() => setActiveChart('orders')}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Буюртмалар
                            </button>
                        </div>
                    </div>

                    <div className="h-72">
                        {isTrendLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : trend.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <BarChartIcon className="w-12 h-12 mb-4 text-gray-300" />
                                <p>Маълумот топилмади</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                                    <XAxis
                                        dataKey="period"
                                        stroke="#666"
                                        fontSize={12}
                                        angle={timeRange === 'yearly' ? 0 : -45}
                                        textAnchor={timeRange === 'yearly' ? 'middle' : 'end'}
                                        height={60}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={12}
                                        tickFormatter={(value) =>
                                            activeChart === 'revenue' ? formatPrice(value) : formatNumber(value)
                                        }
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'Даромад') return [formatPrice(value), name];
                                            if (name === 'Буюртмалар') return [formatNumber(value), name];
                                            return [formatNumber(value), name];
                                        }}
                                        labelFormatter={(label) => `Сана: ${label}`}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            backgroundColor: 'white'
                                        }}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey={activeChart === 'revenue' ? 'totalRevenue' : 'orderCount'}
                                        fill={activeChart === 'revenue' ? 'url(#colorRevenue)' : 'url(#colorOrders)'}
                                        fillOpacity={0.3}
                                        stroke={activeChart === 'revenue' ? '#3B82F6' : '#10B981'}
                                        strokeWidth={2}
                                        name={activeChart === 'revenue' ? 'Даромад' : 'Буюртмалар'}
                                    />
                                    <Bar
                                        dataKey="totalItems"
                                        fill="#8B5CF6"
                                        name="Сотилган маҳсулот"
                                        barSize={20}
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Trend analysis */}
                    {trendData?.data?.analysis && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <p className="text-sm text-blue-600 font-medium">Энг яхши давр</p>
                                <p className="text-lg font-bold">{trendData.data.analysis.bestPeriod?.period || 'Н/М'}</p>
                                <p className="text-sm text-blue-800">{formatPrice(trendData.data.analysis.bestPeriod?.totalRevenue || 0)}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl">
                                <p className="text-sm text-green-600 font-medium">Умумий даромад</p>
                                <p className="text-lg font-bold">{formatPrice(trendData.data.analysis.totalRevenue || 0)}</p>
                                <p className="text-sm text-green-800">{trendData.data.analysis.totalOrders || 0} буюртма</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl">
                                <p className="text-sm text-purple-600 font-medium">Ўсиш суръати</p>
                                <p className="text-lg font-bold">{trendData.data.analysis.growthRate?.revenue || 0}%</p>
                                <p className="text-sm text-purple-800">Даромад ўсиши</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Categories Pie Chart */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Категориялар бўйича</h2>
                            <p className="text-sm text-gray-500">Маҳсулотлар тақсимланиши</p>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="h-64">
                        {categoryDataLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : categoriesData.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <PieChartIcon className="w-12 h-12 mb-4 text-gray-300" />
                                <p>Маълумот топилмади</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoriesData.slice(0, 6)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="totalSold"
                                        nameKey="category"
                                        label={({ category, soldPercentage }) => {
                                            const catInfo = getCategoryInfo(category);
                                            return `${catInfo.label}: ${Number(soldPercentage || 0).toFixed(1)}%`;
                                        }}
                                    >
                                        {categoriesData.slice(0, 6).map((entry, index) => {
                                            const catInfo = getCategoryInfo(entry.category);
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={catInfo.color}
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const catInfo = getCategoryInfo(props.payload.category);
                                            return [
                                                `${formatNumber(value)} дона`,
                                                catInfo.label
                                            ];
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="mt-6 space-y-3">
                        {categoriesData.slice(0, 4).map((cat, index) => {
                            const catInfo = getCategoryInfo(cat.category);
                            return (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center">
                                        <div
                                            className="w-3 h-3 rounded-full mr-3"
                                            style={{ backgroundColor: catInfo.color }}
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">{catInfo.label}</span>
                                            <div className="text-xs text-gray-500">{cat.totalSold} дона</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold">
                                            {cat.soldPercentage ? Number(cat.soldPercentage).toFixed(1) : '0'}%
                                        </span>
                                        <div className="text-xs text-gray-500">{formatPrice(cat.totalRevenue)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Oylik statistika va Top mahsulotlar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Oylik statistika */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{new Date().getFullYear()} йил ойлик статистика</h2>
                            <p className="text-sm text-gray-500">Ойлар кесимида сотиш ва даромад</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Ойлик</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {monthlyDataLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        ) : monthlyStats.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                                <Calendar className="w-12 h-12 mb-4 text-gray-300" />
                                <p>Маълумот топилмади</p>
                            </div>
                        ) : (
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ой</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Сотилди</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Даромад</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Буюртма</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Уртача</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ўсиш</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.slice(0, 6).map((month, index) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{month.monthName}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold">{formatNumber(month.totalItems)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-blue-600">{formatPrice(month.totalRevenue)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{month.orderCount}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-700">
                                                    {formatPrice(month.avgOrderValue)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className={`flex items-center gap-1 ${parseFloat(month.growth?.revenue || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {parseFloat(month.growth?.revenue || 0) > 0 ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                    <span className="font-medium">{month.growth?.revenue || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Yillik jami */}
                    {monthlyData?.data?.yearlyTotal && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Йиллик даромад</p>
                                    <p className="text-xl font-bold">{formatPrice(monthlyData.data.yearlyTotal.totalRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Йиллик буюртма</p>
                                    <p className="text-xl font-bold">{formatNumber(monthlyData.data.yearlyTotal.totalOrders)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Ўртача ойлик даромад</p>
                                    <p className="text-xl font-bold">{formatPrice(monthlyData.data.yearlyTotal.avgMonthlyRevenue)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top 5 mahsulotlar */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Топ 5 товар</h2>
                            <p className="text-sm text-gray-500">Энг кўп сотиладиган маҳсулотлар</p>
                        </div>
                        <Award className="w-5 h-5 text-yellow-500" />
                    </div>

                    <div className="space-y-4">
                        {productStatsLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                                <Award className="w-12 h-12 mb-4 text-gray-300" />
                                <p>Маълумот топилмади</p>
                            </div>
                        ) : (
                            products.slice(0, 5).map((product, index) => {
                                const catInfo = getCategoryInfo(product.category);
                                console.log(product);

                                return (
                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg font-bold mr-3 group-hover:scale-110 transition-transform">
                                                {product.mainImages ? (
                                                    <img className='w-full h-full object-cover rounded-lg' src={product.mainImages} alt={product.title || product.productTitle} />
                                                ) : index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 truncate max-w-[120px]">
                                                    {product.title || product.productTitle || 'Номаълум'}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {catInfo.label}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">{formatNumber(product.sold || product.totalSold || 0)} дона</div>
                                            <div className="text-xs text-gray-400">
                                                <i>{product.sku}</i>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Mahsulot holati */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Мавжуд маҳсулот:</span>
                            <span className="font-semibold">{products.filter(p => p.count > 0).length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Тугаган маҳсулот:</span>
                            <span className="font-semibold text-red-600">
                                {products.filter(p => p.count === 0).length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-medium text-gray-700">Оз қолган (≤10):</span>
                            <span className="font-semibold text-yellow-600">
                                {products.filter(p => p.count > 0 && p.count <= 10).length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Real-time activity va System status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Real-time activity */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Охирги фаолият</h2>
                            <p className="text-sm text-gray-500">Сўнгги 24 соатдаги буюртмалар</p>
                        </div>
                        <Zap className="w-5 h-5 text-yellow-500" />
                    </div>

                    {isRealtimeLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 p-4 rounded-xl">
                                    <p className="text-sm text-green-600 font-medium">Бугунги даромад</p>
                                    <p className="text-xl font-bold">{formatPrice(realtime.today?.revenue || 0)}</p>
                                    <TrendIndicator change={realtime.changes?.revenue} />
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <p className="text-sm text-blue-600 font-medium">Бугунги буюртма</p>
                                    <p className="text-xl font-bold">{formatNumber(realtime.today?.orders || 0)}</p>
                                    <TrendIndicator change={realtime.changes?.orders} />
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl">
                                    <p className="text-sm text-purple-600 font-medium">Сотилган товар</p>
                                    <p className="text-xl font-bold">{formatNumber(realtime.today?.items || 0)}</p>
                                    <TrendIndicator change={realtime.changes?.items} />
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-gray-700">Сўнгги буюртмалар</h3>
                                {realtime.recentOrders && realtime.recentOrders.length > 0 ? (
                                    realtime.recentOrders.slice(0, 5).map((order, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                                <div>
                                                    <div className="text-sm font-medium"># {index + 1}</div>
                                                    <div className="text-xs text-gray-500">{formatTime(order.createdAt)}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold">{formatPrice(order.total)}</div>
                                                <div className={`text-xs px-2 py-1 rounded-full ${orderStatuses[order.status]?.bg || 'bg-gray-100'} ${orderStatuses[order.status]?.color || 'text-gray-800'}`}>
                                                    {orderStatuses[order.status]?.label || order.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-gray-500">
                                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p>Янги буюртмалар йўқ</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* System status */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Тизим холати</h2>
                            <p className="text-sm text-gray-500">Сервер ва хизматлар мониторинги</p>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>

                    <div className="space-y-4">
                        {systemStatus.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center">
                                    <div className="p-2 bg-white rounded-lg mr-3">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                                        <div className="text-xs text-gray-500">Фаол</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-green-600">{item.value}</div>
                                    <div className="text-xs text-green-600">Online</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Performance metrics */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Ишлаш параметрлари</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Сервер жавоб вақти:</span>
                                <span className="font-semibold">{pingms ? pingms + ' ms' : '--'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Бандлик даражаси:</span>
                                <span className="font-semibold">--</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Хотира фойдаланиш:</span>
                                <span className="font-semibold">-- / --</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center md:text-left">
                        <p className="text-sm text-gray-500 mb-1">Жами буюртмалар</p>
                        <p className="text-xl font-bold text-gray-900">{formatNumber(stats.overall?.totalOrders || 0)}</p>
                        <p className="text-xs text-gray-500">Барча давр учун</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-sm text-gray-500 mb-1">Жами даромад</p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(stats.overall?.totalRevenue || 0)}</p>
                        <p className="text-xs text-gray-500">Барча давр учун</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-sm text-gray-500 mb-1">Жами сотилган</p>
                        <p className="text-xl font-bold text-gray-900">{formatNumber(stats.overall?.totalProductsSold || 0)}</p>
                        <p className="text-xs text-gray-500">Маҳсулот сони</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-2 mb-2 md:mb-0">
                            <Database className="w-4 h-4" />
                            <span>Маълумотлар базаси: {stats.products?.totalProducts || 0} товар, {stats.products?.totalStock || 0} дона омборда</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Фаол: {stats.products?.totalProducts - stats.products?.outOfStockCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Тугаган: {stats.products?.outOfStockCount || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className="lg:hidden">
                {mobileMenuOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
                        <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-lg">
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold">Меню</h3>
                                    <button onClick={() => setMobileMenuOpen(false)}>
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-100">
                                        <Filter className="w-4 h-4 inline mr-2" />
                                        Филтр
                                    </button>
                                    <button className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                        <Download className="w-4 h-4 inline mr-2" />
                                        Хисобот
                                    </button>
                                    <button
                                        onClick={handleRefresh}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-gray-100"
                                    >
                                        <RefreshCw className={`w-4 h-4 inline mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} />
                                        Янгилаш
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}