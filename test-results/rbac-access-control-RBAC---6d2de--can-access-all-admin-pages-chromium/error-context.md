# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e7]
      - heading "Welcome back" [level=3] [ref=e9]
      - paragraph [ref=e10]: Sign in to your Enterprise Reporting account
    - generic [ref=e11]:
      - generic [ref=e12]:
        - alert [ref=e13]:
          - generic [ref=e14]: Invalid email or password
        - generic [ref=e15]:
          - text: Email
          - textbox "Email" [ref=e16]:
            - /placeholder: name@example.com
            - text: admin@admin.com
        - generic [ref=e17]:
          - text: Password
          - textbox "Password" [ref=e18]: admin
      - button "Sign In" [ref=e20] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e21]
```