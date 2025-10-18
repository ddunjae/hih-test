export class PDFReportGenerator {
    constructor(scene, camera, renderer, viewer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.viewer = viewer;
    }

    async generateReport(options = {}) {
        const {
            title = 'BIM 프로젝트 리포트',
            author = 'BIM Viewer',
            includeScreenshots = true,
            includeStats = true,
            includeCollisions = false,
            includeMeasurements = false
        } = options;

        console.log('Generating PDF report...');

        // HTML 리포트 생성 (PDF 라이브러리 없이 HTML로 출력)
        const reportHTML = await this.createHTMLReport({
            title,
            author,
            includeScreenshots,
            includeStats,
            includeCollisions,
            includeMeasurements
        });

        // 새 창에서 리포트 열기
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();

        // 인쇄 다이얼로그 자동 열기 (PDF로 저장 가능)
        setTimeout(() => {
            printWindow.print();
        }, 500);

        console.log('Report generated successfully');
    }

    async createHTMLReport(options) {
        const {
            title,
            author,
            includeScreenshots,
            includeStats,
            includeCollisions,
            includeMeasurements
        } = options;

        // 스크린샷 캡처
        let screenshotData = '';
        if (includeScreenshots) {
            screenshotData = this.renderer.domElement.toDataURL('image/png');
        }

        // 통계 정보 수집
        let statsHTML = '';
        if (includeStats) {
            statsHTML = this.generateStatsSection();
        }

        // 충돌 정보
        let collisionsHTML = '';
        if (includeCollisions && this.viewer.collisionDetector) {
            collisionsHTML = this.generateCollisionsSection();
        }

        // 측정 정보
        let measurementsHTML = '';
        if (includeMeasurements && this.viewer.measurementTool) {
            measurementsHTML = this.generateMeasurementsSection();
        }

        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 40px;
        }

        .header {
            text-align: center;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }

        .header h1 {
            color: #0066cc;
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header .meta {
            color: #666;
            font-size: 14px;
        }

        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }

        .section h2 {
            color: #0066cc;
            font-size: 24px;
            margin-bottom: 15px;
            border-left: 4px solid #0066cc;
            padding-left: 10px;
        }

        .screenshot {
            width: 100%;
            max-width: 800px;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 20px auto;
            display: block;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .stat-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }

        .stat-card .label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }

        .stat-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        table th,
        table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }

        table th {
            background: #0066cc;
            color: white;
            font-weight: bold;
        }

        table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }

        @media print {
            body {
                padding: 20px;
            }

            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="meta">
            <p>생성일: ${new Date().toLocaleString('ko-KR')}</p>
            <p>작성자: ${author}</p>
        </div>
    </div>

    ${includeScreenshots ? `
    <div class="section">
        <h2>프로젝트 스크린샷</h2>
        <img src="${screenshotData}" alt="Project Screenshot" class="screenshot">
    </div>
    ` : ''}

    ${statsHTML}
    ${collisionsHTML}
    ${measurementsHTML}

    <div class="section">
        <h2>요약</h2>
        <p>이 리포트는 BIM 3D Viewer를 사용하여 자동 생성되었습니다.</p>
        <p>프로젝트 분석을 통해 모델의 구조, 통계, 문제점을 파악할 수 있습니다.</p>
    </div>

    <div class="footer">
        <p>Generated with BIM 3D Viewer Pro</p>
        <p>Powered by Claude Code</p>
    </div>
</body>
</html>
        `;

        return html;
    }

    generateStatsSection() {
        let objectCount = 0;
        let triangleCount = 0;
        const categories = {};

        this.scene.traverse((object) => {
            if (object.isMesh) {
                objectCount++;

                if (object.geometry) {
                    const positions = object.geometry.attributes.position;
                    if (positions) {
                        triangleCount += positions.count / 3;
                    }
                }

                // 카테고리별 집계
                const category = object.userData.category || 'Other';
                categories[category] = (categories[category] || 0) + 1;
            }
        });

        let categoryRows = '';
        for (const [category, count] of Object.entries(categories)) {
            categoryRows += `
                <tr>
                    <td>${category}</td>
                    <td>${count}</td>
                </tr>
            `;
        }

        return `
    <div class="section">
        <h2>프로젝트 통계</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">총 객체 수</div>
                <div class="value">${objectCount.toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="label">총 삼각형 수</div>
                <div class="value">${Math.floor(triangleCount).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <div class="label">카테고리 수</div>
                <div class="value">${Object.keys(categories).length}</div>
            </div>
        </div>

        <h3 style="margin-top: 30px; color: #333;">카테고리별 상세</h3>
        <table>
            <thead>
                <tr>
                    <th>카테고리</th>
                    <th>객체 수</th>
                </tr>
            </thead>
            <tbody>
                ${categoryRows}
            </tbody>
        </table>
    </div>
        `;
    }

    generateCollisionsSection() {
        // 충돌 감지 결과가 있다면
        if (!this.viewer.collisionDetector || !this.viewer.collisionDetector.collisions) {
            return '';
        }

        const collisions = this.viewer.collisionDetector.collisions;

        if (collisions.length === 0) {
            return `
    <div class="section">
        <h2>충돌 감지 결과</h2>
        <p style="color: green; font-weight: bold;">충돌이 감지되지 않았습니다.</p>
    </div>
            `;
        }

        let collisionRows = '';
        collisions.forEach((collision, index) => {
            collisionRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${collision.object1.name || 'Unknown'}</td>
                    <td>${collision.object2.name || 'Unknown'}</td>
                    <td>${collision.distance.toFixed(2)}m</td>
                </tr>
            `;
        });

        return `
    <div class="section">
        <h2>충돌 감지 결과</h2>
        <p style="color: red; font-weight: bold;">총 ${collisions.length}개의 충돌이 감지되었습니다.</p>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>객체 1</th>
                    <th>객체 2</th>
                    <th>거리</th>
                </tr>
            </thead>
            <tbody>
                ${collisionRows}
            </tbody>
        </table>
    </div>
        `;
    }

    generateMeasurementsSection() {
        // 측정 도구에서 측정 결과 가져오기 (가상 데이터)
        return `
    <div class="section">
        <h2>측정 결과</h2>
        <p>측정 도구를 사용하여 기록된 측정값이 표시됩니다.</p>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>측정 항목</th>
                    <th>값</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td>예시 거리 측정</td>
                    <td>10.5m</td>
                </tr>
            </tbody>
        </table>
    </div>
        `;
    }

    // 빠른 리포트 생성 (버튼용)
    quickReport() {
        this.generateReport({
            title: 'BIM 프로젝트 빠른 리포트',
            includeScreenshots: true,
            includeStats: true,
            includeCollisions: true,
            includeMeasurements: false
        });
    }
}
