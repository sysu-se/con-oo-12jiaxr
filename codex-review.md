# con-oo-12jiaxr - Review

## Review 结论

代码已经完成了部分真实接入：开始游戏、棋盘渲染、数字输入、Undo/Redo 都能经过 Game/Sudoku。但当前实现仍然把若干核心业务规则和响应式职责留在 Svelte 层，整体更像“领域对象 + 手工刷新适配”，还没有形成以领域对象为中心的干净设计。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | fair |
| OOD | poor |

## 缺点

### 1. 固定格规则没有由领域对象统一提供

- 严重程度：core
- 位置：src/domain/Sudoku.js:106-119, src/components/Board/index.svelte:48-51, src/node_modules/@sudoku/stores/keyboard.js:6-10, src/node_modules/@sudoku/game.js:11-29
- 原因：Sudoku 已经建模了 fixed/isFixed，但界面仍依赖独立的原始题面 grid store 来判断格子是否可编辑、是否为用户输入。固定格这一核心业务规则被拆成两套状态，View 并没有真正消费领域对象里的 fixed 信息，后续一旦加载方式或序列化策略变化，UI 与领域状态就可能漂移。

### 2. 冲突校验逻辑绕开了 Sudoku.validate 并在 Svelte 层重复实现

- 严重程度：core
- 位置：src/domain/Sudoku.js:34-65, src/node_modules/@sudoku/stores/grid.js:14-54
- 原因：数独冲突检测是领域规则，但 invalidCells 直接遍历二维数组重新实现了一套，Sudoku.validate 反而没有进入真实流程。这样会造成业务规则双份实现，削弱 Sudoku 作为核心领域对象的价值，也增加后续修改时两边不一致的风险。

### 3. Svelte 响应式协议泄漏到组件事件处理里

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameInstance.js:4-15, src/components/Controls/Keyboard.svelte:21-27, src/components/Controls/ActionBar/Actions.svelte:27-31, src/components/Controls/ActionBar/Actions.svelte:36-55
- 原因：组件不是消费一个完整的 game store adapter，而是先通过 getGame() 取可变单例，再在每次 guess/undo/redo 后手工调用 gameStore.set(game) 触发刷新。也就是说，领域对象变更不会自行通知 View，UI 必须记住“先改对象，再手动 set”，这不符合推荐的适配层思路，也非常容易漏掉刷新点。

### 4. Game 暴露内部 Sudoku，使历史边界可被绕过

- 严重程度：major
- 位置：src/domain/Game.js:87-95, src/components/Controls/ActionBar/Actions.svelte:21-27
- 原因：getSudoku() 直接返回当前 Sudoku 实例，调用方理论上可以直接对 Sudoku.guess() 写入，从而绕过 Game 的历史管理与撤销重做约束。当前提示逻辑虽然只读取 grid，但这个接口设计已经破坏了 Game 作为会话聚合根的封装边界。

### 5. 提示业务仍主要写在组件中

- 严重程度：major
- 位置：src/components/Controls/ActionBar/Actions.svelte:15-33
- 原因：组件自行读取当前盘面、调用求解器、计算 correctValue，再回头调用 game.guess()。这意味着一个明确的游戏业务动作没有被收敛到 Game 或领域服务，而是散落在 Svelte 组件里，不符合“Game 对外提供面向 UI 的游戏操作入口”和“关键逻辑不要继续放在组件中”的要求。

### 6. 领域不变量校验偏弱

- 严重程度：major
- 位置：src/domain/Sudoku.js:22-29, src/domain/Sudoku.js:124-130
- 原因：createSudoku 只校验 9x9 形状，不校验元素是否为 0-9 的整数；guess 也只做区间比较，字符串和浮点数都可能混入网格。对于规则明确的数独领域对象，输入合法性应该在领域层被更严格地守住，而不是默认依赖 UI 永远传对。

### 7. Keyboard 组件整体被重复粘贴，Svelte 结构高风险

- 严重程度：major
- 位置：src/components/Controls/Keyboard.svelte:1-199
- 原因：从静态阅读看，这个单文件组件包含两套几乎完全相同的 script、模板和 style。它明显偏离 Svelte 单文件组件的常规结构，也会带来编译失败、重复绑定事件或后续维护分叉的高风险。

## 优点

### 1. Sudoku 对内部网格做了防御性拷贝

- 位置：src/domain/Sudoku.js:5-11, src/domain/Sudoku.js:71-85, src/domain/Sudoku.js:113-119
- 原因：构造、clone、toJSON 和 getGrid 都返回深拷贝，避免 UI 直接持有内部二维数组并随手修改，这对撤销重做和状态快照是有价值的。

### 2. Game 已经承担历史管理职责

- 位置：src/domain/Game.js:11-22, src/domain/Game.js:29-44, src/domain/Game.js:60-66
- 原因：猜测时会复制当前状态、写入历史、清空 redo 分支，并提供 canUndo/canRedo；同时加入 MAX_HISTORY 上限，说明历史确实被放在 Game 而不是组件里。

### 3. 开始新局流程已接入领域对象

- 位置：src/node_modules/@sudoku/game.js:11-29, src/node_modules/@sudoku/stores/gameInstance.js:11-15
- 原因：无论随机开局还是导入题面，都会先 createSudoku 再 createGame，然后把 Game 实例放入 store，说明领域对象不是只在测试里存在。

### 4. 棋盘渲染已经来自 Game/Sudoku 导出的视图状态

- 位置：src/node_modules/@sudoku/stores/grid.js:8-12, src/components/Board/index.svelte:40-52
- 原因：Board 不再直接维护用户盘面，而是消费由 gameStore 派生出的 userGrid，这满足了“界面渲染当前局面来自领域对象”的核心要求。

### 5. 用户输入和 Undo/Redo 主流程已走 Game 接口

- 位置：src/components/Controls/Keyboard.svelte:21-27, src/components/Controls/ActionBar/Actions.svelte:36-55
- 原因：数字输入调用 game.guess，撤销重做调用 game.undo/game.redo，关键交互没有把历史逻辑继续写在组件本地状态里。

## 补充说明

- 本次结论仅基于静态阅读，未运行测试，也未启动 Svelte 页面；审查范围限定在 src/domain/*、相关 store，以及直接消费这些对象的 Svelte 组件。
- 关于“界面能够刷新”的判断，来自 gameStore.set(game) -> derived(userGrid) 的静态调用链分析，而不是实际交互验证。
- src/components/Controls/Keyboard.svelte 的重复定义是否已经导致构建失败，本次没有执行构建命令，只能基于静态结构将其判为高风险问题。
