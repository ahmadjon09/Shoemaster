// components/PdfExportButton.jsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { RobotoRegular } from '../fonts/Reg';
import { RobotoBold } from '../fonts/Bold';
import { Download, Loader } from 'lucide-react';
import autoTable from 'jspdf-autotable';

const PdfExportButton = ({
    dashboardData,
    fileName = 'dashboard-report',
    title = 'Дашбоард Хисоботи'
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);

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

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Font registratsiya qilish
    const registerCustomFonts = (pdf) => {
        try {
            // Regular fontni registratsiya qilish
            if (RobotoRegular && typeof RobotoRegular === 'string') {
                const cleanRegular = RobotoRegular.startsWith('data:font/ttf;base64,')
                    ? RobotoRegular.split(',')[1]
                    : RobotoRegular;
                pdf.addFileToVFS('Roboto-Regular.ttf', cleanRegular);
                pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            }

            // Bold fontni registratsiya qilish
            if (RobotoBold && typeof RobotoBold === 'string') {
                const cleanBold = RobotoBold.startsWith('data:font/ttf;base64,')
                    ? RobotoBold.split(',')[1]
                    : RobotoBold;
                pdf.addFileToVFS('Roboto-Bold.ttf', cleanBold);
                pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
            }

            console.log('Fonts registered successfully');
            return true;
        } catch (error) {
            console.warn('Font registration failed, using default fonts:', error);
            return false;
        }
    };

    const exportToPDF = async () => {
        if (!dashboardData) {
            console.error('Dashboard data not found');
            alert('Маълумотлар топилмади. Илтимос, кўриб чиқишни қайта уруниб кўринг.');
            return;
        }

        setIsExporting(true);
        setProgress(10);

        try {
            // PDF yaratish - A4 format, minimal margins
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            setProgress(20);

            // Fontlarni registratsiya qilish
            const fontsRegistered = registerCustomFonts(pdf);
            const mainFont = fontsRegistered ? 'Roboto' : 'helvetica';

            // ---------- SAHIFA 1: ASOSIY STATISTIKALAR ----------
            pdf.setFontSize(20);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55); // gray-800
            pdf.text(title, 105, 15, { align: 'center' });

            pdf.setFontSize(9);
            pdf.setFont(mainFont, 'normal');
            pdf.setTextColor(107, 114, 128); // gray-500
            const now = new Date();
            const dateStr = now.toLocaleDateString('uz-UZ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            pdf.text(`Яратилган: ${dateStr}`, 105, 21, { align: 'center' });

            // Subtle divider line
            pdf.setDrawColor(229, 231, 235); // gray-200
            pdf.setLineWidth(0.3);
            pdf.line(15, 24, 195, 24);

            setProgress(30);

            // Asosiy statistik kartalar - kompakt va professional
            const stats = dashboardData.dashboardData?.data?.data || {};
            pdf.setFontSize(14);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('АСОСИЙ СТАТИСТИКАЛАР', 15, 32);

            // 4 ustunli statistikalar - kompakt joylashish
            const todayStats = [
                {
                    title: 'Бугунги даромад',
                    value: formatPrice(stats.today?.totalRevenue || 0),
                    color: [37, 99, 235], // blue-600
                    bgColor: [239, 246, 255] // blue-50
                },
                {
                    title: 'Бугунги буюртма',
                    value: formatNumber(stats.today?.orderCount || 0),
                    color: [22, 163, 74], // green-600
                    bgColor: [240, 253, 244] // green-50
                },
                {
                    title: 'Сотилган маҳсулот',
                    value: formatNumber(stats.today?.totalSold || 0),
                    color: [124, 58, 237], // violet-600
                    bgColor: [245, 243, 255] // violet-50
                },
                {
                    title: 'Ўртача буюртма',
                    value: formatPrice(stats.today?.orderCount ?
                        (stats.today.totalRevenue / stats.today.orderCount) : 0),
                    color: [245, 158, 11], // amber-600
                    bgColor: [255, 251, 235] // amber-50
                }
            ];

            todayStats.forEach((stat, index) => {
                const x = 15 + (index * 45); // Qisqaroq oraliq
                pdf.setFillColor(stat.bgColor[0], stat.bgColor[1], stat.bgColor[2]);
                pdf.roundedRect(x, 37, 42, 18, 2, 2, 'F');

                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
                pdf.setFontSize(11);
                pdf.text(stat.value, x + 21, 48, { align: 'center' });

                pdf.setFont(mainFont, 'normal');
                pdf.setTextColor(75, 85, 99); // gray-600
                pdf.setFontSize(8);
                pdf.text(stat.title, x + 21, 52, { align: 'center' });
            });

            setProgress(40);

            // Umumiy statistikalar - vertical space optimization
            pdf.setFontSize(14);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('УМУМИЙ СТАТИСТИКА', 15, 62);

            const overallStats = [
                ['Жами даромад:', formatPrice(stats.overall?.totalRevenue || 0)],
                ['Жами буюртма:', formatNumber(stats.overall?.totalOrders || 0)],
                ['Жами сотилган:', formatNumber(stats.overall?.totalProductsSold || 0)],
                ['Ўртача даромад:', formatPrice(stats.overall?.avgOrderValue || 0) || '0 сум'],
                ['Фойда фоизи:', (stats.overall?.profitMargin || 0) + '%']
            ];

            overallStats.forEach((stat, index) => {
                const y = 68 + (index * 6); // Kamroq oraliq
                pdf.setFont(mainFont, 'bold');
                pdf.setFontSize(9);
                pdf.setTextColor(75, 85, 99);
                pdf.text(stat[0], 15, y);

                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text(stat[1], 70, y);
            });

            // Minimal bo'sh joy
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128);
            pdf.text('Дашбоард Панели | www.shoemaster.com', 105, 105, { align: 'center' });

            setProgress(50);

            // ---------- SAHIFA 2: TREND VA CATEGORY MA'LUMOTLARI ----------
            pdf.addPage();

            // Trend ma'lumotlari
            const trend = dashboardData.trendData?.data?.data || [];
            pdf.setFontSize(14);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('СОТИШЛАР ТЕНДЕНЦИЯСИ', 15, 15);

            if (trend.length > 0) {
                const trendHeaders = ['Давр', 'Даромад', 'Буюртма', 'Сотилди'];
                const trendRows = trend.map(item => [
                    item.period,
                    formatPrice(item.totalRevenue || 0),
                    formatNumber(item.orderCount || 0),
                    formatNumber(item.totalItems || 0)
                ]);

                autoTable(pdf, {
                    startY: 20,
                    margin: { left: 15, right: 15 },
                    head: [trendHeaders],
                    body: trendRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [37, 99, 235], // blue-600
                        textColor: 255,
                        fontSize: 9,
                        fontStyle: 'bold',
                        font: mainFont,
                        cellPadding: 3
                    },
                    bodyStyles: {
                        fontSize: 8,
                        font: mainFont,
                        cellPadding: 2
                    },
                    alternateRowStyles: { fillColor: [249, 250, 251] }, // gray-50
                    styles: {
                        font: mainFont,
                        cellPadding: 2,
                        lineWidth: 0.1
                    }
                });
            } else {
                pdf.setFontSize(10);
                pdf.setTextColor(156, 163, 175);
                pdf.text('Тенденция маълумотлари топилмади', 15, 25);
            }

            setProgress(60);

            // Category ma'lumotlari - kamroq vertical space
            const categories = dashboardData.categoryData?.data?.data || [];
            const currentY = pdf.lastAutoTable?.finalY || 45;

            if (currentY < 120) { // Faqat joy bo'lsa
                pdf.setFontSize(14);
                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('КАТЕГОРИЯЛАР БЎЙИЧА', 15, currentY + 10);

                if (categories.length > 0) {
                    const categoryHeaders = ['Категория', 'Сотилди', 'Даромад', '%'];
                    const categoryRows = categories.map(cat => [
                        cat.category || 'Номаълум',
                        formatNumber(cat.totalSold || 0),
                        formatPrice(cat.totalRevenue || 0),
                        (cat.soldPercentage || 0) + '%'
                    ]);

                    autoTable(pdf, {
                        startY: currentY + 15,
                        margin: { left: 15, right: 15 },
                        head: [categoryHeaders],
                        body: categoryRows,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [124, 58, 237], // violet-600
                            textColor: 255,
                            fontSize: 9,
                            fontStyle: 'bold',
                            font: mainFont,
                            cellPadding: 3
                        },
                        bodyStyles: {
                            fontSize: 8,
                            font: mainFont,
                            cellPadding: 2
                        },
                        alternateRowStyles: { fillColor: [249, 250, 251] },
                        styles: {
                            font: mainFont,
                            cellPadding: 2,
                            lineWidth: 0.1
                        }
                    });
                }
            }

            setProgress(70);

            // ---------- SAHIFA 3: OYLIK VA MAHSULOTLAR ----------
            pdf.addPage();

            // Oylik statistika
            const monthly = dashboardData.monthlyData?.data?.data || [];
            pdf.setFontSize(14);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('ОЙЛИК СТАТИСТИКА', 15, 15);

            if (monthly.length > 0) {
                const monthlyHeaders = ['Ой', 'Даромад', 'Буюртма', 'Сотилди', 'Ўртача', 'Ўсиш %'];
                const monthlyRows = monthly.map(month => [
                    month.monthName || 'Номаълум',
                    formatPrice(month.totalRevenue || 0),
                    formatNumber(month.orderCount || 0),
                    formatNumber(month.totalItems || 0),
                    formatPrice(month.avgOrderValue || 0),
                    (month.growth?.revenue || 0) + '%'
                ]);

                autoTable(pdf, {
                    startY: 20,
                    margin: { left: 15, right: 15 },
                    head: [monthlyHeaders],
                    body: monthlyRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [22, 163, 74], // green-600
                        textColor: 255,
                        fontSize: 9,
                        fontStyle: 'bold',
                        font: mainFont,
                        cellPadding: 3
                    },
                    bodyStyles: {
                        fontSize: 8,
                        font: mainFont,
                        cellPadding: 2
                    },
                    alternateRowStyles: { fillColor: [240, 253, 244] }, // green-50
                    styles: {
                        font: mainFont,
                        cellPadding: 2,
                        lineWidth: 0.1
                    }
                });
            }

            setProgress(80);

            // Top mahsulotlar - yangi sahifa o'rniga bir sahifaga sig'diramiz
            const products = dashboardData.productStats?.data?.data || [];
            const monthlyY = pdf.lastAutoTable?.finalY || 45;

            if (monthlyY < 120) {
                pdf.setFontSize(14);
                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('ТОП 5 МАҲСУЛОТЛАР', 15, monthlyY + 10);

                if (products.length > 0) {
                    const productHeaders = ['№', 'Маҳсулот', 'Категория', 'Сотилди', 'Даромад'];
                    const productRows = products.slice(0, 5).map((product, index) => [
                        index + 1,
                        (product.title || product.productTitle || 'Номаълум').substring(0, 20) + (product.title?.length > 20 ? '...' : ''),
                        (product.category || 'Номаълум').substring(0, 10),
                        formatNumber(product.sold || product.totalSold || 0),
                        formatPrice(product.revenue || product.totalRevenue || 0)
                    ]);

                    autoTable(pdf, {
                        startY: monthlyY + 15,
                        margin: { left: 15, right: 15 },
                        head: [productHeaders],
                        body: productRows,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [245, 158, 11], // amber-600
                            textColor: 255,
                            fontSize: 9,
                            fontStyle: 'bold',
                            font: mainFont,
                            cellPadding: 3
                        },
                        bodyStyles: {
                            fontSize: 8,
                            font: mainFont,
                            cellPadding: 2
                        },
                        alternateRowStyles: { fillColor: [255, 251, 235] }, // amber-50
                        styles: {
                            font: mainFont,
                            cellPadding: 2,
                            lineWidth: 0.1
                        }
                    });
                }
            }

            setProgress(90);

            // ---------- SAHIFA 4: OXIRGI FAOLIYAT VA FOOTER ----------
            pdf.addPage();

            // Real-time activity
            const realtime = dashboardData.realtimeData?.data?.data || {};
            pdf.setFontSize(14);
            pdf.setFont(mainFont, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('ОХИРГИ ФАОЛИЯТ', 15, 15);

            // Real-time kartalar - minimal dizayn
            const realtimeStats = [
                {
                    title: 'Бугунги даромад',
                    value: formatPrice(realtime.today?.revenue || 0),
                    color: [22, 163, 74], // green-600
                    bgColor: [240, 253, 244] // green-50
                },
                {
                    title: 'Бугунги буюртма',
                    value: formatNumber(realtime.today?.orders || 0),
                    color: [37, 99, 235], // blue-600
                    bgColor: [239, 246, 255] // blue-50
                },
                {
                    title: 'Сотилган товар',
                    value: formatNumber(realtime.today?.items || 0),
                    color: [124, 58, 237], // violet-600
                    bgColor: [245, 243, 255] // violet-50
                }
            ];

            realtimeStats.forEach((stat, index) => {
                const x = 15 + (index * 60);
                pdf.setFillColor(stat.bgColor[0], stat.bgColor[1], stat.bgColor[2]);
                pdf.roundedRect(x, 22, 55, 16, 2, 2, 'F');

                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
                pdf.setFontSize(11);
                pdf.text(stat.value, x + 27.5, 31, { align: 'center' });

                pdf.setFont(mainFont, 'normal');
                pdf.setTextColor(75, 85, 99);
                pdf.setFontSize(8);
                pdf.text(stat.title, x + 27.5, 35, { align: 'center' });
            });

            // Recent orders - kompakt jadval
            const recentOrders = realtime.recentOrders || [];
            const realtimeY = 45;

            if (recentOrders.length > 0) {
                pdf.setFontSize(12);
                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('СЎНГГИ БУЮРТМАЛАР', 15, realtimeY);

                const orderHeaders = ['№', 'ID', 'Миқдори', 'Жами', 'Ҳолати'];
                const orderRows = recentOrders.slice(0, 6).map((order, index) => [
                    index + 1,
                    order.id ? order.id.substring(0, 6) + '...' : 'N/A',
                    formatNumber(order.totalItems || 0),
                    formatPrice(order.total || 0),
                    (order.status || 'N/A').substring(0, 8)
                ]);

                autoTable(pdf, {
                    startY: realtimeY + 5,
                    margin: { left: 15, right: 15 },
                    head: [orderHeaders],
                    body: orderRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [239, 68, 68], // red-600
                        textColor: 255,
                        fontSize: 9,
                        fontStyle: 'bold',
                        font: mainFont,
                        cellPadding: 3
                    },
                    bodyStyles: {
                        fontSize: 8,
                        font: mainFont,
                        cellPadding: 2
                    },
                    alternateRowStyles: { fillColor: [254, 242, 242] }, // red-50
                    styles: {
                        font: mainFont,
                        cellPadding: 2,
                        lineWidth: 0.1
                    }
                });
            }

            // Footer info - minimal
            const footerY = pdf.lastAutoTable?.finalY || 95;
            if (footerY < 200) {
                pdf.setFontSize(12);
                pdf.setFont(mainFont, 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text('ЯКУНЛОВЧИ МАЪЛУМОТЛАР', 15, footerY + 10);

                pdf.setFontSize(9);
                pdf.setFont(mainFont, 'normal');
                pdf.setTextColor(75, 85, 99);

                const widgets = dashboardData.widgetsData?.data?.data || {};
                const footerInfo = [
                    `Жами маҳсулот: ${formatNumber(widgets.products?.totalProducts || 0)}`,
                    `Омборда: ${formatNumber(widgets.products?.inStock || 0)}`,
                    `Тугаган: ${formatNumber(widgets.products?.outOfStock || 0)}`,
                    `Ҳафталик: ${formatPrice(widgets.weekly?.revenue || 0)}`,
                    `Ойлик: ${formatPrice(widgets.monthly?.revenue || 0)}`,
                    `Йиллик: ${formatPrice(widgets.yearly?.revenue || 0)}`
                ];

                // Ikkita ustunga bo'lish
                footerInfo.forEach((info, index) => {
                    const column = index < 3 ? 15 : 100;
                    const row = index < 3 ? footerY + 17 + (index * 5) : footerY + 17 + ((index - 3) * 5);
                    pdf.text(info, column, row);
                });
            }

            // Sahifa nomerlari - minimal footer
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(7);
                pdf.setFont(mainFont, 'normal');
                pdf.setTextColor(156, 163, 175); // gray-400
                pdf.text(
                    `Саҳифа ${i} / ${totalPages} | ${now.getFullYear()}`,
                    195,
                    287,
                    { align: 'right' }
                );
            }

            // Metadata
            pdf.setProperties({
                title: title,
                subject: 'Dashboard statistika hisoboti',
                author: 'Tizim Administratori',
                keywords: 'dashboard, statistika, hisobot, sotuv, daromad',
                creator: 'Dashboard Panel'
            });

            setProgress(95);

            // Save PDF
            pdf.save(`${fileName}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.pdf`);

            setProgress(100);

            // Reset progress after delay
            setTimeout(() => {
                setIsExporting(false);
                setProgress(0);
            }, 800);

        } catch (error) {
            console.error('PDF yaratishda xato:', error);
            setIsExporting(false);
            setProgress(0);
            alert('PDF яратишда хато юз берди. Илтимос, қайта уруниб кўринг.');
        }
    };

    return (
        <div className="relative">
            <button
                onClick={exportToPDF}
                disabled={isExporting}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${isExporting
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:scale-[1.02] active:scale-95'
                    }
                `}
            >
                {isExporting ? (
                    <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="min-w-[100px] text-left">Яратилмоқда ({progress}%)</span>
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        <span className="min-w-[90px] text-left">PDF Хисобот ᵇᵉᵗᵃ</span>
                    </>
                )}
            </button>

            {isExporting && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-lg shadow-lg p-3 border border-gray-100 z-50">
                    <div className="text-xs font-medium text-gray-700 mb-1.5">
                        PDF ҳисобот тайёрланмоқда...
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="text-[10px] text-gray-500 text-right">
                        {progress}%
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfExportButton;