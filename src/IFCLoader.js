import * as THREE from 'three';

export class IFCLoader {
    constructor(scene) {
        this.scene = scene;
        this.ifcModels = [];
        this.loader = null;
        this.isInitialized = false;
    }

    async initLoader() {
        if (this.isInitialized) return true;

        try {
            console.log('Initializing IFC Loader...');

            // web-ifc-three를 동적으로 import
            const module = await import('web-ifc-three/IFCLoader');
            const ThreeIFCLoader = module.IFCLoader;

            this.loader = new ThreeIFCLoader();

            // WASM 파일 경로 설정
            this.loader.ifcManager.setWasmPath('/');

            // 메모리 최적화 설정
            this.loader.ifcManager.setupThreeMeshBVH();

            this.isInitialized = true;
            console.log('✓ IFC Loader initialized successfully');
            return true;
        } catch (error) {
            console.error('✗ Failed to initialize IFC loader:', error);
            alert('IFC 로더 초기화 실패. web-ifc-three 패키지를 확인하세요.');
            return false;
        }
    }

    async loadIFCFile(file, onProgress) {
        console.log('Loading IFC file:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);

        // 로더 초기화 대기
        if (!this.isInitialized) {
            const initialized = await this.initLoader();
            if (!initialized) {
                throw new Error('IFC Loader not initialized');
            }
        }

        // 파일 크기 체크 (100MB 이상 경고)
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 100) {
            const proceed = confirm(
                `파일 크기가 ${fileSizeMB.toFixed(1)}MB로 매우 큽니다.\n` +
                `로딩에 시간이 오래 걸리고 브라우저가 느려질 수 있습니다.\n` +
                `계속하시겠습니까?`
            );
            if (!proceed) {
                throw new Error('User cancelled large file loading');
            }
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = event.target.result;
                    const blob = new Blob([data]);
                    const url = URL.createObjectURL(blob);

                    console.log('Starting IFC parse...');

                    this.loader.load(
                        url,
                        (ifcModel) => {
                            console.log('✓ IFC file parsed successfully');
                            try {
                                this.processIFCModel(ifcModel);
                                this.ifcModels.push(ifcModel);
                                URL.revokeObjectURL(url);

                                // 메모리 정리
                                if (global.gc) {
                                    global.gc();
                                }

                                console.log('✓ IFC model loaded and processed');
                                resolve(ifcModel);
                            } catch (processError) {
                                console.error('Error processing IFC model:', processError);
                                URL.revokeObjectURL(url);
                                reject(processError);
                            }
                        },
                        (progressEvent) => {
                            if (progressEvent.lengthComputable) {
                                const percent = (progressEvent.loaded / progressEvent.total) * 100;
                                console.log(`Loading: ${percent.toFixed(1)}%`);
                                if (onProgress) {
                                    onProgress(percent);
                                }
                            }
                        },
                        (error) => {
                            console.error('✗ IFC Load error:', error);
                            URL.revokeObjectURL(url);

                            // 더 자세한 에러 메시지
                            let errorMessage = 'IFC 파일을 로드할 수 없습니다.';

                            if (error.message.includes('memory')) {
                                errorMessage = '메모리 부족: 파일이 너무 큽니다. 더 작은 파일을 시도하거나 브라우저를 재시작하세요.';
                            } else if (error.message.includes('wasm')) {
                                errorMessage = 'WASM 파일을 찾을 수 없습니다. 페이지를 새로고침하세요.';
                            } else if (error.message.includes('parse')) {
                                errorMessage = 'IFC 파일 형식이 잘못되었거나 손상되었습니다.';
                            }

                            alert(errorMessage);
                            reject(new Error(errorMessage));
                        }
                    );
                } catch (error) {
                    console.error('File read error:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                const error = new Error('파일을 읽을 수 없습니다.');
                console.error(error);
                reject(error);
            };

            reader.readAsArrayBuffer(file);
        });
    }

    processIFCModel(ifcModel) {
        console.log('Processing IFC model...');

        // 모델 경계 상자 계산
        const box = new THREE.Box3().setFromObject(ifcModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 모델을 중심으로 이동
        ifcModel.position.sub(center);

        // 씬에 추가
        this.scene.add(ifcModel);

        let meshCount = 0;
        let triangleCount = 0;

        // 재질 최적화 및 통계 수집
        ifcModel.traverse((child) => {
            if (child.isMesh) {
                meshCount++;

                // 삼각형 수 계산
                if (child.geometry && child.geometry.attributes.position) {
                    triangleCount += child.geometry.attributes.position.count / 3;
                }

                // IFC 속성 추출 및 저장
                this.extractIFCProperties(child);

                // 그림자 설정
                child.castShadow = true;
                child.receiveShadow = true;

                // 재질 최적화
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            this.optimizeMaterial(mat);
                        });
                    } else {
                        this.optimizeMaterial(child.material);
                    }
                }

                // 원본 재질 저장 (나중에 복원용)
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }

                // 선택 가능 표시
                child.userData.selectable = true;
            }
        });

        console.log('IFC Model loaded:', {
            meshes: meshCount,
            triangles: Math.floor(triangleCount),
            size: `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`,
            center: `(${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`
        });
    }

    extractIFCProperties(object) {
        // IFC 속성이 이미 있으면 유지
        if (!object.userData.ifcType) {
            // 이름에서 IFC 타입 추출 시도
            const name = object.name || '';

            // 일반적인 IFC 타입 패턴 감지
            if (name.includes('Wall') || name.includes('WALL')) {
                object.userData.ifcType = 'IfcWall';
            } else if (name.includes('Door') || name.includes('DOOR')) {
                object.userData.ifcType = 'IfcDoor';
            } else if (name.includes('Window') || name.includes('WINDOW')) {
                object.userData.ifcType = 'IfcWindow';
            } else if (name.includes('Slab') || name.includes('Floor') || name.includes('FLOOR')) {
                object.userData.ifcType = 'IfcSlab';
            } else if (name.includes('Roof') || name.includes('ROOF')) {
                object.userData.ifcType = 'IfcRoof';
            } else if (name.includes('Column') || name.includes('COLUMN')) {
                object.userData.ifcType = 'IfcColumn';
            } else if (name.includes('Beam') || name.includes('BEAM')) {
                object.userData.ifcType = 'IfcBeam';
            } else if (name.includes('Stair') || name.includes('STAIR')) {
                object.userData.ifcType = 'IfcStair';
            } else {
                object.userData.ifcType = 'IfcBuildingElement';
            }
        }

        // expressID가 없으면 고유 ID 생성
        if (!object.userData.expressID) {
            object.userData.expressID = object.id;
        }

        // 추가 메타데이터
        if (!object.userData.category) {
            object.userData.category = this.getCategoryFromIFCType(object.userData.ifcType);
        }
    }

    getCategoryFromIFCType(ifcType) {
        const typeMap = {
            'IfcWall': 'Walls',
            'IfcDoor': 'Doors',
            'IfcWindow': 'Windows',
            'IfcSlab': 'Floors',
            'IfcRoof': 'Roofs',
            'IfcColumn': 'Columns',
            'IfcBeam': 'Beams',
            'IfcStair': 'Stairs',
            'IfcRailing': 'Railings',
            'IfcFurnishingElement': 'Furniture'
        };

        return typeMap[ifcType] || 'Other';
    }

    optimizeMaterial(material) {
        // 양면 렌더링
        material.side = THREE.DoubleSide;

        // 정밀도 낮춤 (성능 향상)
        material.precision = 'mediump';

        // 불필요한 기능 비활성화
        if (!material.transparent) {
            material.alphaTest = 0;
        }
    }

    countObjects(object) {
        let count = 0;
        object.traverse(() => count++);
        return count;
    }

    clearModels() {
        console.log('Clearing all IFC models...');

        this.ifcModels.forEach(model => {
            this.scene.remove(model);

            // 메모리 해제
            model.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            this.disposeMaterial(mat);
                        });
                    } else {
                        this.disposeMaterial(child.material);
                    }
                }
            });
        });

        this.ifcModels = [];
        console.log('✓ All models cleared');
    }

    disposeMaterial(material) {
        // 텍스처 해제
        if (material.map) material.map.dispose();
        if (material.lightMap) material.lightMap.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.specularMap) material.specularMap.dispose();
        if (material.envMap) material.envMap.dispose();

        material.dispose();
    }

    getModels() {
        return this.ifcModels;
    }

    // 메모리 사용량 추정
    estimateMemoryUsage() {
        let totalTriangles = 0;

        this.ifcModels.forEach(model => {
            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    const positions = child.geometry.attributes.position;
                    if (positions) {
                        totalTriangles += positions.count / 3;
                    }
                }
            });
        });

        // 대략적인 메모리 사용량 (MB)
        // 각 삼각형: 3 vertices × 3 coordinates × 4 bytes = 36 bytes
        const estimatedMB = (totalTriangles * 36) / (1024 * 1024);

        return {
            triangles: Math.floor(totalTriangles),
            estimatedMemoryMB: estimatedMB.toFixed(2)
        };
    }
}
