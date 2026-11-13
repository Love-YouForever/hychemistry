    // 中国警方官网地址 (公安部官方门户网站)
    const POLICE_URL = 'https://www.mps.gov.cn/';

    /**
     * 弹出确认框并跳转至警方官网
     * @returns {boolean} 是否执行跳转
     */
    function redirectToPoliceWithConfirm() {
        // 弹框内容完全按照题目要求
        const userConfirmed = confirm("该实验具有一定的危险性，个人禁止操作，真的要继续吗");
        if (userConfirmed) {
            // 自动跳转到中国警方官网
            window.location.href = POLICE_URL;
            return true;
        }
        return false;
    }

    // 获取右侧卡片容器 (整个文本框)
    const rightCard = document.getElementById('rightDangerCard');
    // 获取内部的链接元素 (插入链接)
    const policeLink = document.getElementById('policeRedirectLink');

    // 1. 为整个右侧文本框绑定点击事件 (点击框内任意区域，触发弹框+跳转)
    //   注意: 需要避免点击链接时重复触发两次弹框，所以对链接单独处理时阻止冒泡。
    if (rightCard) {
        rightCard.addEventListener('click', function(event) {
            // 如果点击的目标是链接本身，或者链接的后代元素（比如链接内部的span等），由于链接有独立的事件处理并且会阻止冒泡，
            // 我们在这里再增加一层判断，如果事件目标来源于链接区域，就不再执行卡片整体跳转，避免双重弹框。
            let target = event.target;
            // 向上查找是否点击元素位于 .police-link 或其内部
            let isClickOnLink = target.closest('#policeRedirectLink');
            if (isClickOnLink) {
                // 让链接自己处理，卡片不再重复触发
                return;
            }
            // 否则（点击的是卡片其他区域：标题、警告框、段落等）触发确认跳转
            event.preventDefault();
            redirectToPoliceWithConfirm();
        });
    }

    // 2. 为插入的链接单独绑定点击事件 (符合“插入链接”且点击链接也会触发相同的安全确认)
    if (policeLink) {
        policeLink.addEventListener('click', function(event) {
            // 阻止链接默认跳转（因为我们要用自定义确认框）
            event.preventDefault();
            // 阻止事件冒泡到父容器 rightCard，避免双重触发弹框
            event.stopPropagation();
            // 弹出确认框，若确认则跳转警方官网
            redirectToPoliceWithConfirm();
        });
    }

    // 额外增强：为了防止右侧卡片内的其他元素（如未来动态添加内容）误触默认行为，但没有其他超链接，确保体验完美。
    // 并且背景图片如果因为后缀原因未加载，不影响功能，仅视觉效果。
    // 提供控制台友好提示。
    console.log("彩蛋页面已加载 ———— 实验室安全为先，严禁非法操作。");