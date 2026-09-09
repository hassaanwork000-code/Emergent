# Auth Testing Playbook

Auth uses JWT (token in response body) + bcrypt. Token sent via `Authorization: Bearer <token>` header.

## API Testing
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
# signup
curl -X POST "$API/api/auth/signup" -H "Content-Type: application/json" -d '{"email":"player@test.com","password":"test1234","name":"Test Player"}'
# login
curl -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"email":"player@test.com","password":"test1234"}'
# me (use token from login)
curl "$API/api/auth/me" -H "Authorization: Bearer <TOKEN>"
```
Login/signup return `{token, user}`. `/auth/me` returns `{user}`. bcrypt hash starts with `$2b$`.
