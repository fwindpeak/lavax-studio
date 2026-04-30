//lava的指针操作测试
//片头菜单坐标
char Title_Menu[] =
{
    4, 102, 10, 152, 23, 102, 24, 152, 37, 102, 38, 152, 51, 102, 52, 152, 65
};

char KeyPause(int delaytime)
{
    char key;
    if (delaytime != 0)
    {
        Delay(delaytime);
    }
    key = CheckKey(128);
    if (key == 0)
    {
        while(Inkey() != 0);
        key = getchar();
    }
    return ConvertKey(key);
}
void main() {
  int i, j;
  char p;
  addr ptr;
  p = 1;
  do{
    ptr = Title_Menu + 1+(p - 1) *4;
    Box(*ptr, *(ptr + 1), *(ptr + 2), *(ptr + 3), 1, 2);
    char key = KeyPause(200);
    if(key == 20 || key == 22){
      if (p > 1)
                {
                    p--;
                }
                else
                {
                    p = Title_Menu[0];
                }
    }else if(key ==21 || key == 21){
      if (p < Title_Menu[0])
                {
                    p++;
                }
                else
                {
                    p = 1;
                }
    }else if(key == 27){
      break;
    }
  }
  printf("bye!!");
  getchar();
  
}