---
title: 分享一个IP签名档/IP卡片源码
categories: Code
tags: 
   - 腾讯地图
   - IP签名档
id: ip-signature-card
date: 2026-07-05 01:06:35
cover: https://img.tucang.cc/api/image/show/aa4f1208dd0daa96e07848399122dcf2
recommend: true
---
## 前言
每次有人打开你的博客，底部挂着张图，图上显示 TA 自己的 IP、所在城市、实时天气、用的什么系统和浏览器 —— 这种小东西挺有意思的。

效果大概长这样：

![IP签名档预览](https://img.tucang.cc/api/image/show/1aecc5027768dedea6a570e336201eb2)
:::note{type=info}
上面这是美化版的，下面是正常版的预览
![IP签名档](https://img.tucang.cc/api/image/show/aa4f1208dd0daa96e07848399122dcf2)
:::
部署不算复杂，前后半小时搞定。

## 你需要什么

- 一台 Linux 服务器（1C1G 够用）
- PHP 8.0+，带 GD、curl、mbstring
- 一个腾讯位置服务的 API Key（微信登录就能注册，不要钱）

## 部署

### 安装环境

```bash
apt update
apt install -y nginx php-fpm php-gd php-curl php-mbstring
```

验证：

```bash
nginx -v && php -v && php -m | grep -E "gd|curl|mbstring"
```

### 配置 Nginx

创建 `/etc/nginx/sites-available/ip_sign`：

```nginx
server {
    listen 8080;
    server_name _;
    root /var/www/ip_sign;
    index index.php index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    }
}
```

启用：

```bash
ln -sf /etc/nginx/sites-available/ip_sign /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 上传文件

把 `ip_sign` 文件夹放到 `/var/www/`，然后：

```bash
chmod -R 755 /var/www/ip_sign/
```

### 申请 Key

1. 打开 [lbs.qq.com](https://lbs.qq.com/)，微信扫码登录
2. 控制台 → 创建应用 → 类型选「其他」
3. 创建 Key → 勾选 **WebServiceAPI**
4. 进入配额管理，给 **IP定位** 和 **天气查询** 分配额度

:::note{type="warning"}
新 Key 默认没有配额，必须手动分配才能用，别漏了这步。
:::
> 手机用户也可以在微信小程序搜索`腾讯位置服务`，操作更方便

把 Key 填进 `index.php` 第 6 行：

```php
private $key = '你的Key';
```

### 端口转发

如果你的服务器是 NAT 机型，在控制台加一条：

| 外部端口 | 内部端口 | 协议 |
|---------|---------|------|
| 80/443等 | 8080 | TCP |

### 嵌入博客

一行 HTML 的事：

```html
<img src="http://你的域名或IP/">
```

刷新页面，搞定。

## 自定义

改标语（`index.php` 第 57 行）：

```php
$by_text = "欢迎来到 你的博客名";
```

改颜色：搜 `imagecolorallocate`，后面三个数字是 RGB。

自定义文字：URL 加参数 `?diy=base64字符串`。

## 下载

[蓝奏云下载](https://qmyyxiao.lanzoum.com/iMi8Q3uftwkf)

里面有完整的 PHP 代码 + 图片素材。Key 改好就能直接部署。

有什么问题留言问。

::btn[演示地址]{link="http://ip.xiaoh.cc.cd:47903" type="import"}