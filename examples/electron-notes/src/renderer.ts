import './styles.css';

const status = document.querySelector<HTMLParagraphElement>('#status');
if (status) status.textContent = `运行平台：${window.desktop.platform}`;
