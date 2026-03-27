/**
 * PROG2005 A2 Part1 - TypeScript库存管理系统
 * 作者：XXX
 * 日期：2026-XX-XX
 * 功能：实现库存系统的增删改查、筛选、展示、数据验证等所有功能
 * 移动架构适配：组件化解耦、DOM缓存、轻量化操作、响应式交互
 */

// ===================== 1. 数据模型层：定义强类型接口，贴合移动数据完整性要求 =====================
/**
 * 库存商品接口：定义所有必填/可选字段，强类型约束
 * 符合作业要求：Item ID唯一，仅Comment可选，其余字段必填
 */
interface InventoryItem {
  itemId: string;          // 商品ID（唯一）
  itemName: string;        // 商品名称
  category: 'Electronics' | 'Furniture' | 'Clothing' | 'Tools' | 'Miscellaneous'; // 分类
  quantity: number;        // 数量（数字）
  price: number;           // 价格（数字，保留2位小数）
  supplier: string;        // 供应商
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock'; // 库存状态
  isPopular: 'Yes' | 'No'; // 是否热门
  comment?: string;        // 备注（可选）
}

// ===================== 2. 工具类层：封装通用工具，解耦业务逻辑，提升移动性能 =====================
/**
 * 全局反馈工具类：实现无缝反馈机制，替代alert，提升UX
 * 移动适配：固定位置，淡入淡出，适配所有移动屏幕
 */
class Feedback {
  private static feedbackElement: HTMLElement;
  private static timer: number | null = null;

  // 初始化反馈框
  public static init(): void {
    this.feedbackElement = document.getElementById('feedback') as HTMLElement;
  }

  /**
   * 显示反馈消息
   * @param message 反馈内容
   * @param type 反馈类型：success/error/warning
   * @param duration 显示时长（默认3000ms）
   */
  public static show(message: string, type: 'success' | 'error' | 'warning', duration: number = 3000): void {
    // 清除之前的定时器，避免多个反馈叠加
    if (this.timer) clearTimeout(this.timer);
    // 设置反馈样式和内容
    this.feedbackElement.className = 'feedback ' + type;
    this.feedbackElement.innerHTML = message;
    this.feedbackElement.classList.add('show');
    // 自动隐藏
    this.timer = setTimeout(() => {
      this.feedbackElement.classList.remove('show');
    }, duration) as unknown as number;
  }
}

/**
 * DOM工具类：封装DOM操作，实现DOM缓存，减少移动设备DOM查询耗时
 */
class DOMUtil {
  public static elements: { [key: string]: HTMLElement } = {};

  public static init(ids: string[]): void {
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) this.elements[id] = element;
      else console.error(`DOM元素${id}未找到`);
    });
  }

  // ✅ 修复后的 get 方法，不报错
  public static get(id: string): HTMLElement {
    return this.elements[id]!;
  }
}

// ===================== 3. 业务逻辑层：封装库存操作，高阶问题解决与集成能力 =====================
/**
 * 库存管理器类：封装所有库存业务逻辑，增删改查、筛选、数据验证
 * 移动架构适配：内存数据管理，轻量计算，无服务器交互，符合作业要求
 */
class InventoryManager {
  private inventory: InventoryItem[]; // 库存数据数组，会话内持久化

  constructor() {
    this.inventory = []; // 初始化空数组，也可硬编码测试数据（作业支持）
    // 可选：添加硬编码测试数据，方便调试
    // this.inventory = [
    //   {
    //     itemId: 'E001',
    //     itemName: '笔记本电脑',
    //     category: 'Electronics',
    //     quantity: 50,
    //     price: 1299.99,
    //     supplier: 'Harvey Norman',
    //     stockStatus: 'In Stock',
    //     isPopular: 'Yes',
    //     comment: '2026新款'
    //   }
    // ];
  }

  /**
   * 获取所有库存商品
   * @returns 库存商品数组
   */
  public getAllItems(): InventoryItem[] {
    return [...this.inventory]; // 返回副本，避免直接修改原数据
  }

  /**
   * 根据商品名称搜索
   * @param name 商品名称（模糊匹配）
   * @returns 匹配的商品数组
   */
  public searchItemByName(name: string): InventoryItem[] {
    if (!name) return this.getAllItems();
    return this.inventory.filter(item => 
      item.itemName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * 获取所有热门商品
   * @returns 热门商品数组
   */
  public getPopularItems(): InventoryItem[] {
    return this.inventory.filter(item => item.isPopular === 'Yes');
  }

  /**
   * 验证商品ID是否唯一
   * @param id 商品ID
   * @returns true=唯一，false=重复
   */
  public isItemIdUnique(id: string): boolean {
    return !this.inventory.some(item => item.itemId === id);
  }

  /**
   * 根据商品名称查找商品
   * @param name 商品名称
   * @returns 商品对象/undefined
   */
  public findItemByName(name: string): InventoryItem | undefined {
    return this.inventory.find(item => item.itemName === name);
  }

  /**
   * 添加商品：严格数据验证，保证数据完整性
   * @param item 待添加的商品对象
   * @returns true=添加成功，false=添加失败
   */
  public addItem(item: InventoryItem): boolean {
    // 验证ID唯一
    if (!this.isItemIdUnique(item.itemId)) {
      Feedback.show(`商品ID${item.itemId}已存在，无法添加`, 'error');
      return false;
    }
    // 验证数量/价格为非负数
    if (item.quantity < 0 || item.price < 0) {
      Feedback.show('数量和价格不能为负数', 'error');
      return false;
    }
    // 价格保留2位小数，避免移动设备浮点精度问题
    item.price = Math.round(item.price * 100) / 100;
    // 添加商品
    this.inventory.push(item);
    Feedback.show(`商品${item.itemName}添加成功`, 'success');
    return true;
  }

  /**
   * 编辑商品：按名称修改，保留原ID（ID唯一不可改）
   * @param name 商品名称
   * @param newItem 新的商品数据
   * @returns true=编辑成功，false=编辑失败
   */
public editItem(name: string, newItem: InventoryItem): boolean {
  const index = this.inventory.findIndex(item => item.itemName === name);
  if (index === -1) {
    Feedback.show(`商品${name}不存在，无法编辑`, 'error');
    return false;
  }

  // 增加非空判断，让 TS 确认一定存在
  const originalItem = this.inventory[index];
  if (!originalItem) {
    Feedback.show('商品数据异常，无法编辑', 'error');
    return false;
  }

  // 验证新ID是否与原ID一致，或新ID未被使用（若修改ID）
  if (newItem.itemId !== originalItem.itemId && !this.isItemIdUnique(newItem.itemId)) {
    Feedback.show(`新商品ID${newItem.itemId}已存在，无法编辑`, 'error');
    return false;
  }

  // 价格保留2位小数
  newItem.price = Math.round(newItem.price * 100) / 100;
  // 替换商品数据，保留原索引
  this.inventory[index] = newItem;
  Feedback.show(`商品${name}编辑成功`, 'success');
  return true;
}

  /**
   * 删除商品：按名称删除，带确认反馈（innerHTML实现）
   * @param name 商品名称
   * @returns true=删除成功，false=删除失败
   */
  public deleteItem(name: string): boolean {
    const index = this.inventory.findIndex(item => item.itemName === name);
    if (index === -1) {
      Feedback.show(`商品${name}不存在，无法删除`, 'error');
      return false;
    }
    // 移除商品
    this.inventory.splice(index, 1);
    Feedback.show(`商品${name}删除成功`, 'success');
    return true;
  }

  /**
   * 验证表单数据是否完整（必填字段）
   * @param formData 表单数据对象
   * @returns true=完整，false=不完整
   */
  public validateFormData(formData: Partial<InventoryItem>): boolean {
    // 检查必填字段是否为空
    const requiredFields = ['itemId', 'itemName', 'category', 'quantity', 'price', 'supplier', 'stockStatus', 'isPopular'];
    for (const field of requiredFields) {
      // @ts-ignore 动态检查字段
      if (!formData[field] && formData[field] !== 0) {
        Feedback.show(`请填写必填字段：${field}`, 'warning');
        return false;
      }
    }
    return true;
  }
}

// ===================== 4. UI交互层：封装UI操作，与业务逻辑解耦，适配移动交互 =====================
/**
 * UI渲染器类：封装所有UI渲染操作，将库存数据渲染到页面，响应式展示
 */
class UIRenderer {
  private inventoryManager: InventoryManager;
  private tableBody: HTMLElement;
  private emptyTip: HTMLElement;

  constructor(inventoryManager: InventoryManager) {
    this.inventoryManager = inventoryManager;
    this.tableBody = DOMUtil.get('inventoryTableBody');
    this.emptyTip = DOMUtil.get('emptyTip');
  }

  /**
   * 渲染库存表格
   * @param items 待渲染的商品数组
   */
  public renderInventoryTable(items: InventoryItem[]): void {
    // 清空表格
    this.tableBody.innerHTML = '';
    // 无数据时显示空提示
    if (items.length === 0) {
      this.emptyTip.classList.add('show');
      return;
    }
    this.emptyTip.classList.remove('show');
    // 渲染每一行商品
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.itemId}</td>
        <td>${item.itemName}</td>
        <td>${item.category}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>${item.supplier}</td>
        <td>${item.stockStatus}</td>
        <td>${item.isPopular}</td>
        <td>${item.comment || '无'}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }

  /**
   * 获取表单数据：从输入框获取数据，转换为强类型InventoryItem
   * @returns 表单数据对象
   */
public getFormData(): InventoryItem {
  const commentVal = (DOMUtil.get('itemComment') as HTMLTextAreaElement).value.trim();
  
  const formData = {
    itemId: (DOMUtil.get('itemId') as HTMLInputElement).value.trim(),
    itemName: (DOMUtil.get('itemName') as HTMLInputElement).value.trim(),
    category: (DOMUtil.get('itemCategory') as HTMLSelectElement).value as InventoryItem['category'],
    quantity: Number((DOMUtil.get('itemQuantity') as HTMLInputElement).value),
    price: Number((DOMUtil.get('itemPrice') as HTMLInputElement).value),
    supplier: (DOMUtil.get('itemSupplier') as HTMLInputElement).value.trim(),
    stockStatus: (DOMUtil.get('itemStockStatus') as HTMLSelectElement).value as InventoryItem['stockStatus'],
    isPopular: (DOMUtil.get('itemPopular') as HTMLSelectElement).value as InventoryItem['isPopular'],
  };

  // 只有有内容时才加 comment
  if (commentVal) {
    (formData as any).comment = commentVal;
  }

  return formData as InventoryItem;
}

  /**
   * 清空表单输入框
   */
  public clearForm(): void {
    (DOMUtil.get('itemId') as HTMLInputElement).value = '';
    (DOMUtil.get('itemName') as HTMLInputElement).value = '';
    (DOMUtil.get('itemCategory') as HTMLSelectElement).value = '';
    (DOMUtil.get('itemQuantity') as HTMLInputElement).value = '';
    (DOMUtil.get('itemPrice') as HTMLInputElement).value = '';
    (DOMUtil.get('itemSupplier') as HTMLInputElement).value = '';
    (DOMUtil.get('itemStockStatus') as HTMLSelectElement).value = '';
    (DOMUtil.get('itemPopular') as HTMLSelectElement).value = '';
    (DOMUtil.get('itemComment') as HTMLTextAreaElement).value = '';
  }

  /**
   * 填充表单数据：根据商品名称填充，用于编辑操作
   * @param name 商品名称
   */
  public fillFormByName(name: string): void {
    const item = this.inventoryManager.findItemByName(name);
    if (!item) {
      Feedback.show(`商品${name}不存在，无法填充表单`, 'error');
      return;
    }
    (DOMUtil.get('itemId') as HTMLInputElement).value = item.itemId;
    (DOMUtil.get('itemName') as HTMLInputElement).value = item.itemName;
    (DOMUtil.get('itemCategory') as HTMLSelectElement).value = item.category;
    (DOMUtil.get('itemQuantity') as HTMLInputElement).value = item.quantity.toString();
    (DOMUtil.get('itemPrice') as HTMLInputElement).value = item.price.toString();
    (DOMUtil.get('itemSupplier') as HTMLInputElement).value = item.supplier;
    (DOMUtil.get('itemStockStatus') as HTMLSelectElement).value = item.stockStatus;
    (DOMUtil.get('itemPopular') as HTMLSelectElement).value = item.isPopular;
    (DOMUtil.get('itemComment') as HTMLTextAreaElement).value = item.comment || '';
  }

  /**
   * 显示删除确认：使用innerHTML实现，替代confirm，符合作业要求
   * @param name 商品名称
   * @param callback 确认后的回调函数
   */
  public showDeleteConfirm(name: string, callback: () => void): void {
    // 创建确认框DOM
    const confirmBox = document.createElement('div');
    confirmBox.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 2rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      z-index: 1000;
      min-width: 280px;
      text-align: center;
    `;
    confirmBox.innerHTML = `
      <h3 style="color: #2c3e50; margin-bottom: 1rem;">确认删除</h3>
      <p style="color: #34495e; margin-bottom: 2rem;">是否确定删除商品${name}？此操作不可恢复。</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="confirmDelete" class="btn delete" style="min-width: 100px;">确认</button>
        <button id="cancelDelete" class="btn show-all" style="min-width: 100px;">取消</button>
      </div>
    `;
    // 创建遮罩层
    const mask = document.createElement('div');
    mask.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 999;
    `;
    // 添加到页面
    document.body.appendChild(mask);
    document.body.appendChild(confirmBox);
    // 绑定事件
    document.getElementById('confirmDelete')?.addEventListener('click', () => {
      callback();
      document.body.removeChild(confirmBox);
      document.body.removeChild(mask);
    });
    document.getElementById('cancelDelete')?.addEventListener('click', () => {
      document.body.removeChild(confirmBox);
      document.body.removeChild(mask);
      Feedback.show('已取消删除', 'warning');
    });
  }
}

// ===================== 5. 应用初始化：整合所有组件，实现高级组件集成，启动应用 =====================
/**
 * 应用初始化函数：整合数据模型、工具类、业务逻辑、UI交互
 * 移动架构核心：各组件低耦合集成，保证应用在移动设备上的可维护性和性能
 */
function initApp(): void {
  // 1. 初始化DOM缓存：缓存所有核心元素，仅查询一次
  DOMUtil.init([
    'itemId', 'itemName', 'itemCategory', 'itemQuantity', 'itemPrice',
    'itemSupplier', 'itemStockStatus', 'itemPopular', 'itemComment',
    'addBtn', 'editBtn', 'deleteBtn', 'searchInput', 'searchBtn',
    'showAllBtn', 'showPopularBtn', 'inventoryTableBody', 'emptyTip', 'feedback'
  ]);
  // 2. 初始化全局反馈工具
  Feedback.init();
  // 3. 实例化业务逻辑和UI渲染器
  const inventoryManager = new InventoryManager();
  const uiRenderer = new UIRenderer(inventoryManager);
  // 4. 初始化渲染：显示空表格/测试数据
  uiRenderer.renderInventoryTable(inventoryManager.getAllItems());

  // ===================== 绑定所有事件监听器，实现交互功能 =====================
  // 添加商品按钮
  DOMUtil.get('addBtn').addEventListener('click', () => {
    const formData = uiRenderer.getFormData();
    if (inventoryManager.validateFormData(formData)) {
      if (inventoryManager.addItem(formData)) {
        uiRenderer.renderInventoryTable(inventoryManager.getAllItems());
        uiRenderer.clearForm();
      }
    }
  });

  // 编辑商品按钮
  DOMUtil.get('editBtn').addEventListener('click', () => {
    const formData = uiRenderer.getFormData();
    const originalName = (DOMUtil.get('itemName') as HTMLInputElement).value.trim();
    if (inventoryManager.validateFormData(formData)) {
      if (inventoryManager.editItem(originalName, formData)) {
        uiRenderer.renderInventoryTable(inventoryManager.getAllItems());
        uiRenderer.clearForm();
      }
    }
  });

  // 删除商品按钮：带确认反馈
  DOMUtil.get('deleteBtn').addEventListener('click', () => {
    const name = (DOMUtil.get('itemName') as HTMLInputElement).value.trim();
    if (!name) {
      Feedback.show('请输入要删除的商品名称', 'warning');
      return;
    }
    // 显示自定义确认框
    uiRenderer.showDeleteConfirm(name, () => {
      inventoryManager.deleteItem(name);
      uiRenderer.renderInventoryTable(inventoryManager.getAllItems());
      uiRenderer.clearForm();
    });
  });

  // 搜索商品按钮
  DOMUtil.get('searchBtn').addEventListener('click', () => {
    const searchText = (DOMUtil.get('searchInput') as HTMLInputElement).value.trim();
    const result = inventoryManager.searchItemByName(searchText);
    uiRenderer.renderInventoryTable(result);
    Feedback.show(`找到${result.length}个匹配商品`, 'success');
  });

  // 显示全部商品按钮
  DOMUtil.get('showAllBtn').addEventListener('click', () => {
    (DOMUtil.get('searchInput') as HTMLInputElement).value = '';
    uiRenderer.renderInventoryTable(inventoryManager.getAllItems());
    Feedback.show('已显示所有商品', 'success');
  });

  // 显示热门商品按钮
  DOMUtil.get('showPopularBtn').addEventListener('click', () => {
    const popularItems = inventoryManager.getPopularItems();
    uiRenderer.renderInventoryTable(popularItems);
    Feedback.show(`找到${popularItems.length}个热门商品`, 'success');
  });

  // 移动设备优化：搜索框回车触发搜索
  DOMUtil.get('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      (DOMUtil.get('searchBtn') as HTMLButtonElement).click();
    }
  });

  // 初始化成功反馈
  Feedback.show('库存管理系统初始化成功，可开始操作', 'success');
}

// 页面加载完成后启动应用：保证DOM元素全部加载，避免移动设备加载延迟问题
document.addEventListener('DOMContentLoaded', initApp);