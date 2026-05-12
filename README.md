# TrackingHub

TrackingHub 是内部多项目埋点治理与产品分析平台，包含 Web 管理后台、事件接收 API、Web SDK、Flutter SDK，以及面向 Docker Compose 的本地生产候选运行栈。

## Docker 一键安装

机器上只需要先安装 Docker，然后执行：

```bash
git clone https://github.com/ssyamv/trackinghub.git
cd trackinghub
bash scripts/install-docker.sh
```

脚本会自动完成：

- 生成本地 `.env` 配置文件。
- 构建并启动 Postgres、ClickHouse、TrackingHub Web。
- 等待三个容器进入健康状态。
- 创建或更新本地管理员账号。
- 输出访问地址和登录账号。

默认访问地址是 [http://localhost:3000](http://localhost:3000)，健康检查地址是 [http://localhost:3000/api/health](http://localhost:3000/api/health)。

如果要自定义端口或管理员账号，先复制并编辑 `.env`：

```bash
cp .env.example .env
```

常用配置项：

```bash
TRACKINGHUB_WEB_PORT=3000
TRACKINGHUB_POSTGRES_PORT=15432
TRACKINGHUB_CLICKHOUSE_HTTP_PORT=18123
TRACKINGHUB_CLICKHOUSE_NATIVE_PORT=19000

TRACKINGHUB_ADMIN_EMAIL=admin@your-company.com
TRACKINGHUB_ADMIN_PASSWORD=replace-with-a-long-random-password
TRACKINGHUB_ADMIN_NAME=平台管理员
```

再次运行安装脚本会复用现有数据卷并幂等更新管理员账号：

```bash
bash scripts/install-docker.sh
```

## 常用 Docker 命令

```bash
docker compose ps
docker compose logs -f web
docker compose down
```

需要清理本地数据卷时再执行：

```bash
docker compose down -v
```

## 运行巡检与备份

仓库内置 Compose 运行巡检和数据备份脚本：

```bash
pnpm run monitor:compose
pnpm run backup:compose
pnpm run verify:backup
pnpm run drill:backup
```

更完整的开发、迁移和运营说明见 [apps/web/README.md](apps/web/README.md)。
