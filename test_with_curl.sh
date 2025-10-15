#!/bin/bash
# MP3 测试脚本 - 使用 curl

echo "======================================"
echo "MP3 Task Management API 测试脚本"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000/api"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试 1: GET /api/users
echo -e "${BLUE}[测试 1] GET /api/users - 获取所有用户${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" $BASE_URL/users | head -20
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 2: POST /api/users
echo -e "${BLUE}[测试 2] POST /api/users - 创建新用户${NC}"
USER_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}')
echo "$USER_RESPONSE"
USER_ID=$(echo "$USER_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}创建的用户 ID: $USER_ID${NC}"
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 3: GET /api/users/:id
echo -e "${BLUE}[测试 3] GET /api/users/:id - 获取单个用户${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" $BASE_URL/users/$USER_ID
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 4: PUT /api/users/:id
echo -e "${BLUE}[测试 4] PUT /api/users/:id - 更新用户${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X PUT $BASE_URL/users/$USER_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated User","email":"updated@example.com"}'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 5: 查询参数 - WHERE
echo -e "${BLUE}[测试 5] 查询参数 - WHERE (已完成的任务)${NC}"
curl -s -G $BASE_URL/tasks \
  --data-urlencode 'where={"completed":true}' \
  --data-urlencode 'count=true'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 6: 查询参数 - SORT
echo -e "${BLUE}[测试 6] 查询参数 - SORT (按名称排序)${NC}"
curl -s -G $BASE_URL/users \
  --data-urlencode 'sort={"name":1}' \
  --data-urlencode 'limit=3' \
  --data-urlencode 'select={"name":1,"email":1}'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 7: 查询参数 - LIMIT & SKIP
echo -e "${BLUE}[测试 7] 查询参数 - LIMIT & SKIP (分页)${NC}"
curl -s -G $BASE_URL/tasks \
  --data-urlencode 'skip=5' \
  --data-urlencode 'limit=3' | head -20
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 8: 错误处理 - 缺少必填字段
echo -e "${BLUE}[测试 8] 错误处理 - 缺少必填字段 (应返回 400)${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -d '{"name":"No Email"}'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 9: 错误处理 - 不存在的资源
echo -e "${BLUE}[测试 9] 错误处理 - 不存在的资源 (应返回 404)${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" $BASE_URL/users/000000000000000000000000
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 10: 错误处理 - 重复 email
echo -e "${BLUE}[测试 10] 错误处理 - 重复 email (应返回 400)${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Duplicate","email":"test@example.com"}'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 11: DELETE /api/users/:id
echo -e "${BLUE}[测试 11] DELETE /api/users/:id - 删除用户${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X DELETE $BASE_URL/users/$USER_ID
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 12: 验证删除 (应返回 404)
echo -e "${BLUE}[测试 12] 验证删除 - 再次获取已删除用户 (应返回 404)${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" $BASE_URL/users/$USER_ID
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 13: Tasks API
echo -e "${BLUE}[测试 13] POST /api/tasks - 创建新任务${NC}"
TASK_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST $BASE_URL/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Task","description":"Testing","deadline":"2024-12-31"}')
echo "$TASK_RESPONSE"
TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}创建的任务 ID: $TASK_ID${NC}"
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 14: 双向引用 - 分配任务给用户
echo -e "${BLUE}[测试 14] 双向引用 - 创建分配给用户的任务${NC}"
# 获取一个用户
FIRST_USER=$(curl -s $BASE_URL/users?limit=1)
FIRST_USER_ID=$(echo "$FIRST_USER" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
FIRST_USER_NAME=$(echo "$FIRST_USER" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "将任务分配给用户: $FIRST_USER_NAME (ID: $FIRST_USER_ID)"

ASSIGNED_TASK=$(curl -s -X POST $BASE_URL/tasks \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Assigned Task\",\"deadline\":\"2024-12-31\",\"assignedUser\":\"$FIRST_USER_ID\",\"assignedUserName\":\"$FIRST_USER_NAME\"}")
ASSIGNED_TASK_ID=$(echo "$ASSIGNED_TASK" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "任务已创建: $ASSIGNED_TASK_ID"

echo "检查用户的 pendingTasks:"
curl -s $BASE_URL/users/$FIRST_USER_ID | grep -o '"pendingTasks":\[[^]]*\]'
echo ""
read -p "按 Enter 继续..."
echo ""

# 测试 15: 数据统计
echo -e "${BLUE}[测试 15] 数据统计${NC}"
echo -n "用户总数: "
curl -s -G $BASE_URL/users --data-urlencode 'count=true'
echo ""
echo -n "任务总数: "
curl -s -G $BASE_URL/tasks --data-urlencode 'count=true'
echo ""
echo -n "已完成任务数: "
curl -s -G $BASE_URL/tasks --data-urlencode 'where={"completed":true}' --data-urlencode 'count=true'
echo ""
echo ""

echo -e "${GREEN}======================================"
echo "测试完成！"
echo "======================================${NC}"
