import * as THREE from 'three';

export class IFCObjectSelector {
    constructor(scene, camera, domElement, ifcLoader) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.ifcLoader = ifcLoader;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.highlightedObjects = [];
    }

    async pickIFCObject(event) {
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // IFC 모델에서만 찾기
        const ifcModels = this.ifcLoader.getModels();
        if (ifcModels.length === 0) {
            console.log('No IFC models loaded');
            return null;
        }

        const intersects = this.raycaster.intersectObjects(ifcModels, true);

        if (intersects.length === 0) {
            return null;
        }

        const firstIntersect = intersects[0];
        const pickedObject = firstIntersect.object;

        // IFC 로더를 통해 상세 정보 가져오기
        const ifcProperties = await this.getIFCProperties(pickedObject, firstIntersect);

        return {
            mesh: pickedObject,
            point: firstIntersect.point,
            face: firstIntersect.face,
            properties: ifcProperties
        };
    }

    async getIFCProperties(object, intersect) {
        const properties = {
            basic: {},
            ifc: {},
            geometry: {},
            material: {}
        };

        // 기본 Three.js 속성
        properties.basic = {
            'ID': object.id,
            '이름': object.name || '이름 없음',
            '타입': object.type,
            'UUID': object.uuid
        };

        // IFC 특정 속성
        if (object.userData) {
            properties.ifc = {
                'IFC Type': object.userData.ifcType || 'Unknown',
                'IFC ID': object.userData.expressID || 'N/A',
                'IFC GUID': object.userData.GlobalId || 'N/A'
            };

            // 추가 사용자 데이터
            for (const [key, value] of Object.entries(object.userData)) {
                if (key !== 'ifcType' && key !== 'expressID' && key !== 'GlobalId' && key !== 'originalMaterial') {
                    properties.ifc[key] = value;
                }
            }
        }

        // 지오메트리 정보
        if (object.geometry) {
            const geo = object.geometry;
            properties.geometry = {
                '정점 수': geo.attributes.position ? geo.attributes.position.count : 0,
                '면 수': geo.index ? geo.index.count / 3 : (geo.attributes.position ? geo.attributes.position.count / 3 : 0),
                'Bounding Box': this.getBoundingBoxInfo(object)
            };
        }

        // 재질 정보
        if (object.material) {
            const mat = object.material;
            properties.material = {
                '타입': mat.type,
                '색상': mat.color ? `#${mat.color.getHexString()}` : 'N/A',
                '투명도': mat.opacity !== undefined ? mat.opacity.toFixed(2) : 'N/A',
                '메탈릭': mat.metalness !== undefined ? mat.metalness.toFixed(2) : 'N/A',
                '거칠기': mat.roughness !== undefined ? mat.roughness.toFixed(2) : 'N/A'
            };
        }

        // 위치 정보
        properties.transform = {
            '위치 X': object.position.x.toFixed(3),
            '위치 Y': object.position.y.toFixed(3),
            '위치 Z': object.position.z.toFixed(3),
            '회전 X': THREE.MathUtils.radToDeg(object.rotation.x).toFixed(1) + '°',
            '회전 Y': THREE.MathUtils.radToDeg(object.rotation.y).toFixed(1) + '°',
            '회전 Z': THREE.MathUtils.radToDeg(object.rotation.z).toFixed(1) + '°',
            '스케일': `${object.scale.x.toFixed(2)} × ${object.scale.y.toFixed(2)} × ${object.scale.z.toFixed(2)}`
        };

        return properties;
    }

    getBoundingBoxInfo(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        return `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`;
    }

    selectObject(object) {
        // 이전 선택 해제
        this.clearSelection();

        if (!object) return;

        this.selectedObject = object;

        // 하이라이트 적용
        this.highlightObject(object);
    }

    highlightObject(object) {
        if (!object.material) return;

        // 원본 재질 저장
        if (!object.userData.originalMaterial) {
            object.userData.originalMaterial = object.material;
        }

        // 하이라이트 재질 생성
        let highlightMaterial;

        if (Array.isArray(object.material)) {
            highlightMaterial = object.material.map(mat => {
                const newMat = mat.clone();
                newMat.emissive = new THREE.Color(0x00aaff);
                newMat.emissiveIntensity = 0.6;
                return newMat;
            });
        } else {
            highlightMaterial = object.material.clone();
            highlightMaterial.emissive = new THREE.Color(0x00aaff);
            highlightMaterial.emissiveIntensity = 0.6;
        }

        object.material = highlightMaterial;
        this.highlightedObjects.push(object);
    }

    highlightMultiple(objects) {
        objects.forEach(obj => this.highlightObject(obj));
    }

    clearSelection() {
        this.highlightedObjects.forEach(object => {
            if (object.userData.originalMaterial) {
                object.material = object.userData.originalMaterial;
            }
        });

        this.highlightedObjects = [];
        this.selectedObject = null;
    }

    isolateObject(object) {
        // 모든 객체 숨김
        this.scene.traverse((child) => {
            if (child.isMesh) {
                child.visible = false;
            }
        });

        // 선택된 객체만 표시
        if (object) {
            object.visible = true;

            // 부모도 표시
            let parent = object.parent;
            while (parent) {
                parent.visible = true;
                parent = parent.parent;
            }
        }
    }

    showAll() {
        this.scene.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
            }
        });
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    // 클릭 위치 근처의 모든 IFC 객체 가져오기
    async getObjectsNearPoint(event, radius = 10) {
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const ifcModels = this.ifcLoader.getModels();
        if (ifcModels.length === 0) return [];

        const intersects = this.raycaster.intersectObjects(ifcModels, true);

        if (intersects.length === 0) return [];

        const firstPoint = intersects[0].point;
        const nearbyObjects = [];

        // radius 내의 모든 객체 찾기
        intersects.forEach(intersect => {
            const distance = firstPoint.distanceTo(intersect.point);
            if (distance <= radius) {
                nearbyObjects.push({
                    object: intersect.object,
                    distance: distance,
                    point: intersect.point
                });
            }
        });

        return nearbyObjects;
    }

    // 특정 IFC 타입의 모든 객체 선택
    selectByIFCType(ifcType) {
        this.clearSelection();

        const objects = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.userData.ifcType === ifcType) {
                objects.push(child);
            }
        });

        this.highlightMultiple(objects);
        return objects;
    }

    // 이름으로 객체 검색
    searchByName(searchTerm) {
        const results = [];
        searchTerm = searchTerm.toLowerCase();

        this.scene.traverse((child) => {
            if (child.isMesh) {
                const name = (child.name || '').toLowerCase();
                const ifcType = (child.userData.ifcType || '').toLowerCase();

                if (name.includes(searchTerm) || ifcType.includes(searchTerm)) {
                    results.push(child);
                }
            }
        });

        return results;
    }
}
