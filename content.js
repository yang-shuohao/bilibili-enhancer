// 创建控制面板
function createPanel() {
  const panel = document.createElement('div');
  panel.id = 'bilibili-ext-panel';
  panel.innerHTML = `
    <div id="panel-header" style="cursor: move; user-select: none; padding-bottom: 6px; border-bottom: 1px solid #666; display: flex; justify-content: space-between; align-items: center;">
      <span>播放器控制</span>
      <button id="toggle-btn" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; line-height:1;">−</button>
    </div>
    <div id="panel-body">
      <label for="speed-slider">播放速度: <span id="speed-value">1.00x</span></label>
      <input type="range" id="speed-slider" min="0.1" max="4" step="0.05" value="1" />
      
      <div style="margin-top:10px;">
        <label>循环播放区间 (秒)：</label>
        <input type="number" id="point-a" placeholder="A点 (开始)" style="width: 45%; margin-right: 5%;" min="0" step="0.1"/>
        <input type="number" id="point-b" placeholder="B点 (结束)" style="width: 45%;" min="0" step="0.1"/>
      </div>
      <button id="start-loop-btn" style="margin-top: 6px;">开始循环播放</button>
      <button id="stop-loop-btn" style="margin-top: 6px;">停止循环播放</button>

      <button id="screenshot-btn" style="margin-top:8px;">截图保存</button>
      <button id="pip-btn" style="margin-top:8px;">浮动播放（画中画）</button>
    </div>
    <a id="github-link" href="https://github.com/yang-shuohao/bilibili-enhancer" target="_blank">
  🌟 GitHub 项目页
</a>
  `;
  document.body.appendChild(panel);
  return panel;
}

// 拖动功能
function makeDraggable(element, handle) {
  let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    mouseX = e.clientX;
    mouseY = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    posX = mouseX - e.clientX;
    posY = mouseY - e.clientY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    element.style.top = (element.offsetTop - posY) + "px";
    element.style.left = (element.offsetLeft - posX) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// 设置播放速度
function setSpeed(speed) {
  const video = document.querySelector('video');
  if (video) video.playbackRate = speed;
  const speedValue = document.getElementById('speed-value');
  if (speedValue) speedValue.textContent = speed.toFixed(2) + 'x';
}

// 截图功能
function takeScreenshot() {
  const video = document.querySelector('video');
  if (!video) return alert('未找到视频元素，截图失败');

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    if (!blob) return alert('截图失败，请重试');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilibili-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// 循环播放变量
let loopInterval = null;

function startLoop() {
  const video = document.querySelector('video');
  if (!video) {
    alert('未找到视频元素，无法循环播放');
    return;
  }
  const aInput = document.getElementById('point-a');
  const bInput = document.getElementById('point-b');

  let pointA = parseFloat(aInput.value);
  let pointB = parseFloat(bInput.value);

  if (isNaN(pointA) || isNaN(pointB)) {
    alert('请填写有效的循环起止时间（秒）');
    return;
  }
  if (pointA < 0 || pointB <= pointA || pointB > video.duration) {
    alert(`请确保 0 <= A < B <= 视频总时长(${video.duration.toFixed(1)}秒)`);
    return;
  }

  video.currentTime = pointA;
  video.play();

  // 清除之前的循环
  if (loopInterval) clearInterval(loopInterval);

  // 定时检查时间是否超过B点
  loopInterval = setInterval(() => {
    if (video.currentTime >= pointB) {
      video.currentTime = pointA;
    }
  }, 200);
}

function stopLoop() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

// 初始化面板和事件绑定
function init() {
  const panel = createPanel();

  const slider = panel.querySelector('#speed-slider');
  const pipBtn = panel.querySelector('#pip-btn');
  const screenshotBtn = panel.querySelector('#screenshot-btn');
  const toggleBtn = panel.querySelector('#toggle-btn');
  const panelBody = panel.querySelector('#panel-body');
  const panelHeader = panel.querySelector('#panel-header');
  const startLoopBtn = panel.querySelector('#start-loop-btn');
  const stopLoopBtn = panel.querySelector('#stop-loop-btn');

  // 读取保存的速度
  const savedSpeed = parseFloat(localStorage.getItem('bilibili-speed')) || 1;
  slider.value = savedSpeed;
  setSpeed(savedSpeed);

  slider.addEventListener('input', e => {
    const speed = parseFloat(e.target.value);
    setSpeed(speed);
    localStorage.setItem('bilibili-speed', speed);
  });

  pipBtn.addEventListener('click', async () => {
    const video = document.querySelector('video');
    if (!video) return alert('找不到视频元素');

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        pipBtn.textContent = '浮动播放（画中画）';
      } else {
        await video.requestPictureInPicture();
        pipBtn.textContent = '退出画中画';
      }
    } catch (err) {
      alert('画中画模式启动失败: ' + err.message);
    }
  });

  screenshotBtn.addEventListener('click', takeScreenshot);

  startLoopBtn.addEventListener('click', startLoop);
  stopLoopBtn.addEventListener('click', () => {
    stopLoop();
    const video = document.querySelector('video');
    if (video) video.pause();
  });

  // 折叠按钮事件
  toggleBtn.addEventListener('click', () => {
    if (panelBody.style.display === 'none') {
      panelBody.style.display = 'block';
      toggleBtn.textContent = '−';
    } else {
      panelBody.style.display = 'none';
      toggleBtn.textContent = '+';
    }
  });

  // 拖动
  makeDraggable(panel, panelHeader);

  // 初始位置
  panel.style.top = '100px';
  panel.style.right = '20px';
  panel.style.left = 'auto';
}

function waitVideoAndInit() {
  if (document.querySelector('video')) {
    init();
  } else {
    setTimeout(waitVideoAndInit, 500);
  }
}

waitVideoAndInit();
