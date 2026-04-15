#ifndef NULL
    #define USE_C_COMPILER
    #include "lava.h"
    #define LAVA_VER    1
    //#define USE_SHORT_NAME
#else
    #define LAVA_VER    1
    #define LCD_W       160
    #define LCD_H       80//80
    #width  LCD_W
    #height LCD_H
#endif

#define USE_EXTERN_IME  1
#define USE_FRAME_CTRL  0
/****************************************
《神州》For Nc2600c
v1.07b
Writer: FantasyDR
ProgramTool: GVMaker v0.9
Date: 2004.8.17

2004.7.11  23:00~24:00
道具菜单终于成为统一的格式了。
2004.7.12  13:20
终于解决了装备奇怪的花屏幕问题了。原来是
忘记给字符串结尾加零了。
2004.7.12  15:40
成功解决神器显示问题。
2004.7.12  23:40
菜单成功写完～
2004.7.13  0:0
加入模拟战斗
2004.7.13  15:17
出现奇怪的错误，不知道如何解决。在事件22
2004.7.13  18:20
发现错误根源。原来是ShowMon函数溢出了。
2004.7.14  0:52
做好交易的买入了。
2004.7.14  1:32
卖出做好了，不过都写在一起了，很乱。
2004.7.14  2:06
全部菜单基本完成。
2004.7.14  11:00
菜单状态记忆系统完成。^_^ OH YEAH~~
2004.7.14  14:36
加入了新的求和函数，使程序整洁。
2004.7.14  15:26
升级系统完成！
2004.7.15  0:52
战斗系统框架完成
2004.7.16  1:04
菜单大部分帖图完成。还是帖了图漂亮啊～
2004.7.16  14:00
继续做帖图，加入动画清屏幕的函数.
2004.7.16  18:10
怪物智能编写完毕
2004.7.17  14:47
加了一堆帖图。爽死了，魔法动画也编完了。
2004.7.17  15:37
游戏流程重新修整，加入LOGO了。
2004.7.17  21:02
加入凤凰羽毛效果
2004.7.17  23:23
做完片尾的评价系统了。现在就剩片头了。还有一些小
Bug等待我去除掉。
2004.7.18  20:58
加入Input函数，可以输入名字，切换大小写。
2004.7.18  22:35
修正了菜单，输入法，对话的bug...
2004.7.19  14:12
点移研究开始。
2004.7.20  1:40
成功实现点移。
2004.7.20  14:40
听取了任我狂的建议，换成CheckKey，不会退出了。
2004.7.20  14:54
将滚屏的错误也修正了。即将加入选项。
2004.7.20  15:43
将块移动做为快速移动添加。
2004.7.21  0:46
加入装备储存，系统全部完成了。剩下的事情就是战斗数据修正...
2004.7.21  1:22
突然心血来潮，加入存档校验系统，防止修改。
2004.7.21  1:34
经过实验，lava的Crc16校验在机子上运行，超过20位会死机
所以不准备加存档校验了。
2004.7.21  2:22
加入装备卸载功能。装备系统全了。
2004.7.21  12:09
加入选项菜单。啊啊，终于全部弄完了。
2004.7.21  18:08
修正了随机对话的小bug
2004.7.21  21:47
修正了战斗菜单溢出的bug...估计原来的bug也是这个原因。
2004.7.26  12:40
旅游归来，用新的bin制作了source。程序没有变化。
2004.7.28  20:49
重新制作了道具图片。基本可以发布了。
2004.7.28  22:06
对话重新修改了一些，道具属性调整一下。
2004.7.29  13:59
修正了战斗的大bug,没有计算装备属性。
2004.7.29  22：28
修正了休息的时候会加满Exp的Bug
2004.7.30  00:20
将两个魔法的攻击力提高了。编译出v1.00正式版，
将但是不发布。因为要增加隐藏剧情。
2004.7.30  15:41
加入隐藏剧情。打出A级以上评价可以玩到^_^
2004.7.30  17:17
听取Athlon的建议，打造修改，升级属性恢复。
2004.7.30  23:34
道具打折出售加入。六折。
2004.8.1   21:51
道具翻页错误修正
2004.8.2   11:32
修正了重新开始会战斗的bug。
装备bug自动修正。
修正了和五毒妖人战斗后不能移动的bug。
2004.8.4   17:21
修正了错误宿屋的bug，
修正了切换地图的bug.
2004.8.10   16:56
再次修正了部分地图bug，已经怪物属性更新。
还有评价系统的bug。
 ****************************************/
//////////////////////////////////////////
#define ScrollH     1
#define ScrollV     1
#define DTIME 0
#define oMap 256   //地图
#define oEvent 28928   //事件偏移
#define oTalk 43264   //对话
#define oBlock 80567   //16*16图素
#define oMonPic 88759   //怪物图
#define oMonDat 97143   //怪物资料
#define oEquPic 100279   //装备图片
#define oItemA 104375   //道具
#define oItemB 106679   //道具
#define oItemC 108855   //道具
#define oItemD 110135   //道具
#define oEquPerFix 112567   //装备前缀
#define oEquName 112711   //装备图片名称
#define oInstead 113191   //地图替换
#define oTitle 113447   //片头图片 !!目前不使用
#define oMagicDat 115047   //魔法属性
#define oMoveMask 117479   //人物行动图库的偏移地址
#define oItemPic 118247   //道具图示
#define oPicLink 126407   //透明图链表
#define oPicSource 130503   //透明图数据
#define oTitleCG 176068   //片头动画
//////////////////////////////////////////
#define pLen  32          //图素数据量
#define LinkH 3840        //链表高位起始
#define LinkL 3584        //链表低位起始
#define ScrW (LCD_W/16-1) //从零开始
#define ScrH (LCD_H/16-1) //从零开始
#define MapW 50           //地图宽
#define MapH 71           //地图长
#define BlockW 16         //图素宽
#define BlockH 16         //图素长
#define Player  0         //游戏主人公图片号码
#define MaxEventNo 39     //最大事件代码
#define TRUE         1
#define FALSE        0
#define LEFT         0
#define RIGHT        1
#define MIDDLE       3
#define SLOW         0
#define NORMAL       1
#define FAST         2
#define NO_TEST      0
#define HALF_TEST    1
#define FULL_TEST    2
#define EquX             42   //装备显示的地方
#define EquY             18
#define ItemLen          128  //道具数据长度
#define MonLen           42
#define wx_max           26   //一行最多26个字母
#define WIN            255
#define LOSE           254
#define AWORD_RATE     25     //获奖几率
#define MAX_LEVEL      100    //最高级别
#define HERO_BODY_PIC  1
//////////////////////////////////////////
#define MEM_LEN      2000
/////////////////////////////////////////////
#define b_ATK       0
#define b_DEF       2
#define b_SPD       4
#define b_INT       6
#define b_LUC       8
#define b_Hp        10
#define b_Mp        12
#define b_mHp       14
#define b_mMp       16
#define b_Level     18
#define b_NAME      19
#define b_NAME_l    10
/////////////////////////////////////////////
#define memfix       3650      //内存地址修正
#define mHeroHead    1000      //主人公头像
#define HeroName     1128
#define MapNo        1311      //地图号
#define tMapNo       1310      //地图读取标志
#define MapX         1305      //地图右上坐标X
#define MapY         1306      //地图右上坐标Y
#define px           1307      //人物坐标X
#define py           1308      //人物坐标Y
#define PlayerFix    1309      //人物图示修正
#define tpx          1301      //人物临时坐标X
#define tpy          1302      //人物临时坐标Y
#define tMapX        1303      //刷屏标志CX
#define tMapY        1304      //刷屏标志Y
#define sMapNo       1312      //进门地图号暂存
#define tBegin       1313      //坐标暂存起始
#define tEnd         1317      //坐标暂存结束
#define sEqu         1322      //装备标志六个级别
#define fEqu         1326      //装备修正值
#define nEqu         1159      //装备号码
#define sItemA_b     1233      //道具A起始
#define sItemA_e     1250      //道具A结束
#define sItemB_b     1251      //道具B起始
#define sItemB_e     1267      //道具B结束
#define sItemC_b     1268      //道具C起始
#define sItemC_e     1277      //道具C结束
#define sItemD_b     1278      //道具D起始
#define sItemD_e     1296      //道具D结束
#define sMagic_b     1173      //魔法开始
#define sMagic_e     1191      //魔法结束
#define sBattle      1297      //战斗标志
#define nMonster     1298      //怪物号，从此开始三字节
#define pInfo        1136      //攻防敏魔抗
#define pInfo_add    1168      //属性增加值
#define Hp           1141      //人物HP
#define Mp           1143
#define Exp          1145
#define Level        1147      //级别
#define Money        1198      //金钱
#define mHp          1192      //人物最大HP
#define mMp          1194
#define mExp         1196
#define bInstead     1200      //地图替换标志开始
#define eInstead     1232      //地图替换标志结束
#define Step         1321      //行走步数
//新加入的
#define mEventDat    0         //eDat开始的数据占用256字节
#define mEquPerFix   256       //装备前缀144字节
#define mEquName     400       //装备名称和数据480字节
#define tItemNum     880       //临时储存道具信息40字节
#define tItemPicNum  920       //道具图片标号储存80字节
#define sWinLose     998       //战斗状态标志（需要再用）
#define nBattleMon   999       //确定要开打的怪物号码
#define EquBox_max   10        //至多10个装备
#define EquBox_len   5         //每个5个字节
#define mEquBox      1550      //装备资料-1749
#define nEquBox      1546      //装备数量-1549
#define sBattle_hero 1800      //战斗中人物属性
#define sBattle_mon  1900      //战斗中怪物属性
//////////////////////////////////////////
#define KEY_UP      20
#define KEY_DOWN    21
#define KEY_RIGHT   22
#define KEY_LEFT	23
#define KEY_ENTER   13
#define KEY_SHIFT   26
#define KEY_CAPS    18
#define KEY_ESC	    27
#define KEY_HELP	25
#define	KEY_PAGEUP		19
#define	KEY_PAGEDOWN	14
#define KEY_Y       121
#define KEY_N       110
#define KEY_F1      28      //确定
#define KEY_F2      29      //取消
#define KEY_F4      31      //卸下装备
//////////////////////////////////////////
#define item_name      2
#define item_kind      12
#define item_info      18
#define item_cost      70
#define item_sign_use  72
#define item_sign_equ  73
#define item_edat      74
#define magic_kind     74
#define magic_mp       80
#define item_name_l    10
#define item_kind_l    6
#define item_info_l    52
#define item_cost_l    2
#define item_edat_l    55
#define magic_kind_l   6
#define magic_mp_l     2
#define equ_info       74
#define equ_kind       75
#define equ_property   78
#define equ_kind_l     3
#define equ_property_l 12
//////////////////////////////////////////
#define mon_num      1
#define mon_x1       2
#define mon_y1       3
#define mon_info     6
#define mon_level    20
#define mon_item     21
#define mon_aword    22    //战斗奖励
#define mon_aword_G  22
#define mon_aword_E  23
#define mon_aword_H  24
#define mon_aword_M  25
#define mon_action   26
#define mon_name     32
#define mon_info_l   14
#define mon_aword_l  4
#define mon_action_l 6
#define mon_name_l   10
//////////////////////////////////////////
#define menu_title       7    //对话的title
//总个数，每行个数，初坐标X，初坐标Y，长，宽，间隔长，间隔宽，下级菜单起始计数
//，系统对话，对话数量，对话位置
#define menu_max         0
#define menu_n_line      1
#define menu_x           2
#define menu_y           3
#define menu_w           4
#define menu_h           5
#define menu_w_jump      6
#define menu_h_jump      7
#define menu_id_next     8
#define menu_systxt      9
#define menu_txtnum      10
#define menu_txtpos      11
////////////////////////////////////////////////////////
#define GAME_START       0   //游戏片头
#define CREAT_HERO       1
#define LOAD_GAME        2
#define TITLE_ANIMATE    3
#define END_GAME         4
#define SAVE_GAME        5
#define EXIT_GAME        6   //退出游戏
#define GAME_OVER        11
#define LEVEL_UP         12

char Key; //按键信息
char isdebug = FALSE;
char GAME_VER[] = "v1.07b+诗诺比修正"; //游戏版本号码
char fp; //游戏资料文件句柄
char block[8192]; //图库数据
char mask[384]; //掩膜Block
char move[384]; //移动动画
char instead[256]; //地图替代
char mem[MEM_LEN]; //模拟Pc1000的ram
char mapdat[4096]; //临时地图信息
char Ns[] = "<name>"; //姓名替换标志
char str_num[11]; //数字转换储存
char IDstack[20]; //菜单ID的栈空间
char ENstack[20]; //菜单是否进入的栈空间
char pID; //菜单ID的指针
char wx = 6; //每个字的宽
char wy = 13; //每个字的长
char IfLink = FALSE; //事件是否连接
char IsJump = FALSE; //是否地图跳转
char IsEnter = FALSE; //是否回车按下
char IsMenuMemary = TRUE; //是否菜单记忆
char MovePixel = 2; //每次移动的点数
char MovePixel0 = 2;
char IfMove; //是否移动
char IsMove;
char SpeedUpKey = 'z'; //按键信息
char CanShowHpMp;
char MoveStep;
char DoDrawPlayer;
char DoDrawMap;
char ms0;
///////////////////////////////////////////////////
//片头菜单坐标
char Title_Menu[] =
{
    4, 102, 10, 152, 23, 102, 24, 152, 37, 102, 38, 152, 51, 102, 52, 152, 65
};
//法宝攻击指示
char ItemD_Attack[] =
{
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    //炎羽
    4,
    //奇角
    7,
    //疾风
    6,
    //造浪
    3,
    //幻剑
    5,
    //迷雾
    8, 101, 101
};
//事件标志过关评价用
char Event_Test[][10] =
{
    50, 30, 0, 1, 1, 1, 2, 2, 2, 2, 50, 31, 1, 1, 1, 1, 1, 1, 1, 1, 50, 33, 1, 1, 0, 1, 1, 0, 1, 0, 50, 32, 1, 0, 1, 1, 1, 0, 1, 1, 50, 14, 2, 2, 2, 2, 2, 1, 2, 2, 50, 34, 0, 0, 0, 0, 1, 1, 1, 2, 50, 8, 0, 0, 2, 2, 2, 2, 2, 2
};

//总个数，每行个数，初坐标X，初坐标Y，宽，长，间隔宽，间隔长，下级菜单起始计数，系统对话，对话数量，对话位置
char MenuData[][12] =
{
    //[Menu]
    //主菜单ID=0
    5, 5, 1, 0, 4, 1, 5, 1, 1, 8, 5, 1,
    //选项ID=1
    3, 1, 6, 2, 16, 1, 14, 1, 215, 0, 0, 0,
    //状态ID=2
    4, 1, 3, 1, 17, 1, 17, 1, 6, 14, 5, 1,
    //物品ID=3
    4, 2, 6, 2, 4, 1, 10, 1, 10, 71, 2, 2,
    //法术ID=4
    0, 0, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0,
    //系统ID=5
    3, 1, 8, 1, 8, 1, 8, 1, 14, 92, 3, 1,
    //状态一ID=6
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //状态二ID=7
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //状态三ID=8
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //状态四ID=9
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //普通ID=10
    0, 0, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0,
    //法宝ID=11
    0, 0, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0,
    //锻造ID=12
    0, 0, 1, 1, 2, 1, 2, 1, 0, 0, 0, 0,
    //特殊ID=13
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //储存ID=14
    2, 1, 8, 2, 10, 1, 10, 1, 0, 0, 0, 0,
    //读取ID=15
    2, 1, 8, 2, 10, 1, 10, 1, 0, 0, 0, 0,
    //退出ID=16
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //打造菜单ID=17
    3, 3, 1, 5, 4, 1, 5, 1, 210, 0, 0, 0,
    //战斗菜单ID=18
    5, 5, 1, 5, 4, 1, 5, 1, 19, 34, 1, 5,
    //攻击ID=19
    2, 2, 4, 5, 8, 1, 10, 1, 24, 28, 1, 5,
    //魔法ID=20
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //道具ID=21
    2, 2, 4, 5, 8, 1, 10, 1, 100, 31, 1, 5,
    //逃跑ID=22
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //状态ID=23
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //普通攻击ID=24
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //附魔攻击ID=25
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //买卖ID=26
    3, 1, 19, 3, 6, 1, 6, 1, 27, 0, 0, 0,
    //买道具ID=27
    0, 6, 1, 0, 2, 1, 2, 1, 0, 0, 0, 0,
    //卖道具ID=28四字菜单
    3, 1, 5, 1, 9, 1, 9, 1, 30, 0, 0, 0,
    //离开ID=29
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    //卖道具详细列表ID=30
    0, 6, 1, 0, 2, 1, 2, 1, 0, 0, 0, 0
    //[MenuEnd]
};
/////////////////////////////////////////////////////////////
#if USE_EXTERN_IME != 0

#include "ime2gb.h"

void Input(addr string, int x, int y, char length)
{
    InputWord(x, y + 1, string, length);
}

#else
#undef  GetWord
char lava_GetWordMode = 0;
int GetWord(char mode)
{
    // mode
    // 0 - ENG
    // 1 - NUM
    // 2 - CHS
    // 3 - LAST
    int ch;
    mode = mode &3;
    if (mode == 3)
    {
        mode = lava_GetWordMode;
    }
    else
    {
        lava_GetWordMode = mode;
    }
    ch = getchar();
    if (mode == 1)
    {
        if (ch == 'b')
        {
            return '1';
        }
        if (ch == 'n')
        {
            return '2';
        }
        if (ch == 'm')
        {
            return '3';
        }
        if (ch == 'g')
        {
            return '4';
        }
        if (ch == 'h')
        {
            return '5';
        }
        if (ch == 'j')
        {
            return '6';
        }
        if (ch == 't')
        {
            return '7';
        }
        if (ch == 'y')
        {
            return '8';
        }
        if (ch == 'u')
        {
            return '9';
        }
    }
    return ch;
}

void Input(addr string, int x, int y, int length)
{
    int c; //字符缓存
    char p; //指针
    char len[256]; //字符长度储存
    char Caps;
    char mode;
    Caps = TRUE;
    mode = 3;
    p = 0;
    do
    {
        Box(x + p * 6, y + 13, x + p * 6+6, y + 14, 1, 1);
        c = GetWord(mode);
        if (c == KEY_F2 || c == KEY_LEFT)
        {
            if (p != 0)
            {
                p = p - len[p];
                *(string + p) = 0;
            }
        }
//        else if(c == KEY_SHIFT)
//        {
//            if (mode == 2)
//                mode=0;
//            else
//                mode++;
//        }
//        else if(c==KEY_CAPS)
//        {
//            if(Caps==FALSE)
//                Caps=TRUE;
//            else
//                Caps=FALSE;
//        }
        else if (c == KEY_ENTER)
        {
            *(string + p) = 0;
            break;
        }
        else
        {
            if ((c &0xff00) == 0 && isprint(c) && p < length)
            {
                //if(Caps==TRUE) c=toupper(c);
                *(string + p) = c;
                p++;
                len[p] = 1;
                *(string + p) = 0;
            }
            else if (c < 0 && p < length - 1)
            {
                //memset(_TEXT+4*20,' ',20); //清除提示行//DEBUG
                *(string + p) = c;
                *(string + p + 1) = c >> 8;
                p = p + 2;
                len[p] = 2;
                *(string + p) = 0;
            }
        }
        Refresh();
        TextOut(x, y, string, 0x43);
    } while (p >= 0);
}
#endif

char ConvertKey(char key)
{
    if (key == 'w') return KEY_UP;
    if (key == 'a') return KEY_LEFT;
    if (key == 's') return KEY_DOWN;
    if (key == 'd') return KEY_RIGHT;
    if (key == 'j') return KEY_F1;
    if (key == 'k') return KEY_F2;
    return key;
}

char WaitKey()
{
    while(CheckKey(128) != 0);
    while(Inkey() != 0);
    return ConvertKey(getchar());
}

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

//debug
/*
void debug(long address)
{
    printf("%d;", address);
    getchar();
    //isdebug=FALSE;
}*/

//游戏初始化代码
void GameInitialize()
{
#ifdef  USE_SHORT_NAME
    fp = fopen("/LavaData/Magic.dat", "rb");
#else
    fp = fopen("/LavaData/GameSource.dat", "rb");
#endif
    if (fp == 0)
    {
        TextOut(0, 0, "无资源文件!", 0x41);
        WaitKey();
        exit(0);
    }
    fseek(fp, oBlock, 0);
    fread(block, 1, 8192, fp);
    fseek(fp, oMoveMask, 0);
    fread(move, 1, 384, fp);
    fseek(fp, oMoveMask + 384, 0);
    fread(mask, 1, 384, fp);
    fseek(fp, oInstead, 0);
    fread(instead, 1, 256, fp);
    fseek(fp, oEquPerFix, 0);
    fread(mem + mEquPerFix, 1, 144, fp);
    fseek(fp, oEquName, 0);
    fread(mem + mEquName, 1, 480, fp);
}

//产生随机数
int rnd(long n)
{
    return (rand() * n) >> 15;
}

//按号码读取地图
void getmap(char n)
{
    if (n > 7)
    {
        n = 7;
    }
    if (n < 1)
    {
        n = 1;
    }
    fseek(fp, oMap + (n - 1) * (long)4096, 0);
    fread(mapdat, 1, 4096, fp);
}

//计算地址函数
long addr16(addr address)
{
    return *(address + 1) * (long)256 + *address;
}

long addr10(addr address)
{
    return *address * (long)100 + *(address + 1);
}

//增加函数
long add_bit16(addr address, long num)
{
    long sum;
    sum = *(address + 1) * (long)256 + *address + num;
    if (sum >= 0 && sum <= 65535)
    {
        *(address + 1) = (sum >> 8) & 255;//(sum / 256);
        *(address) = sum & 255;//sum - (sum / 256) * (long)256 ;
        return TRUE;
    }
    return FALSE;
}

long add_bit8(addr address, long num)
{
    long sum;
    sum = num + (*address);
    if (sum >= 0 && sum <= 255)
    {
        *address = sum & 255;
        return TRUE;
    }
    return FALSE;
}

//求和函数
long sum_bit16(addr address, long num1, long num2)
{
    long sum;
    sum = num1 + num2;
    if (sum >= 0 && sum <= 65535)
    {
        *(address + 1) = (sum >> 8) & 255;//(sum / 256);
        *(address) = sum & 255;//sum - (sum / 256) * (long)256 ;
        return TRUE;
    }
    return FALSE;
}

long sum_bit8(addr address, long num1, long num2)
{
    long sum;
    sum = num1 + num2;
    if (sum >= 0 && sum <= 255)
    {
        *address = sum & 255;
        return TRUE;
    }
    return FALSE;
}

//开关测试函数(1～8)
long Test(char address, char position)
{
    return address & (1 << (position - 1));
}

//模拟poke函数
#ifdef poke
#undef poke
#endif
void poke(int address, char value)
{
    mem[address - memfix] = value;
}

//给定左上角坐标和大小，清屏幕，三中速度。
void AnimateBox(int x, int y, int w, int h, int speed, int type)
{
    int i, step;
    int ax, ay, ix, iy;
    ax = w / 2+x;
    ay = h / 2+y;
    ix = 2 << speed;
    iy = h * ix / w; //计算增量
    step = w / ix / 2-1;
    for (i = 0; i < step; i++)
    {
        i++;
        Box(ax - i * ix, ay - i * iy, ax + i * ix, ay + i * iy, 1,  - type + 1);
        i--;
        Box(ax - i * ix, ay - i * iy, ax + i * ix, ay + i * iy, 1, type);
        Delay(50);
    }
    Box(x, y, x + w - 1, y + h - 1, 1, type);
}

void AnimateBlock(int x, int y, int w, int h, int speed, int type)
{
    int i, step;
    int ax, ay, ix, iy;
    ax = w / 2+x;
    ay = h / 2+y;
    ix = 2 << speed;
    iy = h * ix / w; //计算增量
    step = w / ix / 2-1;
    for (i = 0; i < step; i++)
    {
        i++;
        Block(ax - i * ix, ay - i * iy, ax + i * ix, ay + i * iy,  - type + 1);
        i--;
        Block(ax - i * ix, ay - i * iy, ax + i * ix, ay + i * iy, type);
        Refresh();
        Delay(50);
    }
    Block(x, y, x + w - 1, y + h - 1, type);
    Refresh();
    Delay(50);
}

//给定圆心坐标，清屏幕，三中速度。
void AnimateCircle(int x, int y, int r, int speed, int type)
{
    int i, ir, step;
    ir = 2 << speed;
    step = r / ir;
    for (i = 0; i < step; i++)
    {
        i++;
        Circle(x, y, i *ir, 1,  - type + 1);
        i--;
        Circle(x, y, i *ir, 1, type);
        Delay(50);
    }
    Circle(x, y, r, 1, type);
}

//根据标号画透明图库的图像
void tShowPic(int n, int x, int y, int type, char format)
{
    //共1024个图素,从1开始
    char pic[1600];
    char size[4];
    int len;
    if (n > 1024)
    {
        n = 1024;
    }
    if (n < 1)
    {
        n = 1;
    }
    n--;
    fseek(fp, oPicLink + n * 4, 0);
    fread(size, 1, 4, fp);
    len = (size[2] / 8) *size[3];
    fseek(fp, oPicSource + size[0] * (long)256 +size[1], 0);
    fread(pic, 1, len, fp);
    if (format == MIDDLE)
    {
        WriteBlock(x - size[2] / 2, y - size[3] / 2, size[2], size[3], type, pic);
    }
    else if (format == RIGHT)
    {
        WriteBlock(x - size[2] + 1, y - size[3] + 1, size[2], size[3], type, pic);
    }
    else
    {
        WriteBlock(x, y, size[2], size[3], type, pic);
    }
}

void ShowPic(int n, int x, int y, int type, char format)
{
    if ((type &7) == 0)
    {
        tShowPic(n + 1, x, y, type + 4, format);
        tShowPic(n, x, y, type + 3, format);
    }
    else
    {
        tShowPic(n, x, y, type, format);
    }
}

//画装备图像
void ShowEqu(int n, int x, int y, int type)
{
    char pic[128];
    if (n > 31)
    {
        n = 31;
    }
    if (n < 0)
    {
        n = 0;
    }
    fseek(fp, oEquPic + n * (long)128, 0);
    fread(pic, 1, 128, fp);
    WriteBlock(x, y, 32, 32, type, pic);
}

//根据怪物号画怪物图库的图像
void ShowMon(int n, int x, int y, int type, char format)
{
    char pic[1600];
    char size[4];
    int len;
    if (n > 47)
    {
        n = 47;
    }
    if (n < 0)
    {
        n = 0;
    }
    fseek(fp, oMonPic + n * 4, 0);
    fread(size, 1, 4, fp);
    len = (size[2] / 8) *size[3];
    fseek(fp, oMonPic + size[0] * (long)256 +size[1], 0);
    fread(pic, 1, len, fp);
    if (format == MIDDLE)
    {
        WriteBlock(x + (160-size[2] - x) / 2, y + (80-size[3] - y) / 2, size[2], size[3], type, pic);
    }
    else if (format == RIGHT)
    {
        WriteBlock(x - size[2] + 1, y - size[3] + 1, size[2], size[3], type, pic);
    }
    else
    {
        WriteBlock(x, y, size[2], size[3], type, pic);
    }
}

//根据偏移量画图(X,Y,Width,Height,起始偏移,type)
void DrawPic(int x, int y, int w, int h, long offset, int type)
{
    char pic[1600];
    int len;
    len = (w / 8) *h;
    fseek(fp, offset, 0);
    fread(pic, 1, len, fp);
    WriteBlock(x, y, w, h, type, pic);
}

//移植需要，装备修正
void EqSet(addr InfoAddress, char i)
{
    char EqFix[6];
    memcpy(EqFix, InfoAddress, 6);
    if (i == 0)
    {
        EqFix[1] = EqFix[1] + mem[fEqu + i * 3];
        EqFix[4] = EqFix[4] + mem[fEqu + 1+i * 3];
        EqFix[3] = EqFix[3] + mem[fEqu + 2+i * 3];
    }
    else if (i == 1)
    {
        EqFix[2] = EqFix[2] + mem[fEqu + i * 3];
        EqFix[5] = EqFix[5] + mem[fEqu + 1+i * 3];
        EqFix[3] = EqFix[3] + mem[fEqu + 2+i * 3];
    }
    else if (i == 2)
    {
        EqFix[3] = EqFix[3] + mem[fEqu + i * 3];
        EqFix[2] = EqFix[2] + mem[fEqu + 1+i * 3];
        EqFix[5] = EqFix[5] + mem[fEqu + 2+i * 3];
    }
    else if (i == 3)
    {
        EqFix[4] = EqFix[4] + mem[fEqu + i * 3];
        EqFix[5] = EqFix[5] + mem[fEqu + 1+i * 3];
        EqFix[2] = EqFix[2] + mem[fEqu + 2+i * 3];
    }
    memcpy(InfoAddress, EqFix, 6);
}

//数字转字符串函数,最多转换10位
//转换之后的字符串存在str_num[]里面
void str(long n)
{
    char i;
    long j;
    j = 10;
    i = 0;
    while (n >= j)
    {
        i++;
        j = j * 10;
    } //测试n是几位数字
    str_num[i + 1] = 0;
    while (n / 10 > 0)
    {
        j = n - (n / 10) *10;
        n = n / 10;
        str_num[i] = j + 48;
        i--;
    }
    str_num[i] = n + 48;
}

//格式化字符串最多10位
void fstr(addr string, char len, char format, char fill)
{
    char slen;
    slen = strlen(string); //获取源字符串长度
    if (len == slen)
    {
        return ;
    }
    //如果一样，就不作处理
    if (len < slen)
    //小于则去除
    {
        if (format == RIGHT)
        {
            memmove(string, string + slen - len, len);
        }
        *(string + len) = 0;
        return ;
    }
    if (format == RIGHT)
    //大于则移动
    {
        memmove(string + len - slen, string, slen);
        memset(string, fill, len - slen);
    }
    else if (format == LEFT)
    {
        memset(string + slen, fill, len - slen);
    }
    else if (format == MIDDLE)
    {
        memmove(string + (len - slen) / 2, string, slen);
        memset(string, fill, (len - slen) / 2);
        memset(string + (len - slen) / 2+slen, fill, len - (len - slen) / 2-slen);
    }
    *(string + len) = 0;
}

//绘制菜单
void menudraw(char id)
{
    //数据在MenuData[id][dat]
    char tKey;
    char max, n;
    char x, y, w, h;
    char ix, iy;
    char tID, menuID;

    n = MenuData[id][menu_n_line]; //
    x = MenuData[id][menu_x] *wx;
    y = MenuData[id][menu_y] *wy;
    w = MenuData[id][menu_w] *wx;
    h = MenuData[id][menu_h] *wy;
    ix = MenuData[id][menu_w_jump] *wx;
    iy = MenuData[id][menu_h_jump] *wy;
    tID = MenuData[id][menu_id_next]; //起始ID
    max = MenuData[id][menu_max] + tID - 1; //最大可能达到的ID数目
    menuID = tID; //目前的ID

    if (IsMenuMemary == TRUE && ENstack[pID] == TRUE)
    {
        menuID = IDstack[pID + 1];
        if (menuID > max || menuID < tID)
        {
            menuID = tID;
        }
        else
        {
            y = (menuID - tID) / n * iy + y;
            x = ((menuID - tID) - ((menuID - tID) / n) *n) *ix + x;
        }
    }
    tKey = 0;
    do
    {
        if (tKey == KEY_LEFT)
        {
            if (x - ix >= MenuData[id][menu_x] *wx)
            {
                if (menuID - 1 >= tID)
                {
                    menuID--;
                    x = x - ix;
                }
            }
        }
        if (tKey == KEY_RIGHT)
        {
            if (x + ix <= (MenuData[id][menu_x] *wx + (n - 1) *ix))
            {
                if (menuID + 1 <= max)
                {
                    menuID++;
                    x = x + ix;
                }
            }
        }
        if (tKey == KEY_UP)
        {
            if (menuID - n >= tID)
            {
                menuID = menuID - n;
                y = y - iy;
            }
        }
        if (tKey == KEY_DOWN)
        {
            if (menuID + n <= max)
            {
                menuID = menuID + n;
                y = y + iy;
            }
        }
        if (tKey == KEY_ESC || tKey == KEY_F2)
        {
            ENstack[pID] = FALSE;
            pID--;
            return;
        }
        Refresh();
        Box(x, y, x + w + 1, y + h - 1, 1, 2);
        if (tKey >= KEY_UP && tKey <= KEY_LEFT)
        {
            tKey = KeyPause(160);//debug
        }
        else
        {
            tKey = WaitKey();
        }
    } while (tKey != KEY_ENTER && tKey != KEY_F1); //按键循环
    ENstack[pID] = TRUE;
    pID++;
    IDstack[pID] = menuID;
    return;
}

//读取某个位置的图素号码
long map(char x, char y)
{
    return mapdat[(mem[MapY] + y) * (long)MapW + mem[MapX] + x];
}

//显示文字到指定地点
void MsgPaint(int x, int y, addr string, int type)
{
    char out[wx_max + 1];
    int j, len;
    len = strlen(string);
    if (len + x < wx_max)
    {
        //不够一行
        TextOut(x *wx, y *wy, string, type);
        return ;
    }
    memcpy(out, string, (wx_max - x));
    out[wx_max - x] = 0;
    TextOut(x *wx, y *wy, out, type);
    y++;
    string = string + wx_max - x;
    len = len - (wx_max - x); //非整行处理
    out[wx_max] = 0;
    for (j = 0; j < (len / wx_max); j++)
    {
        memcpy(out, string + j * wx_max, wx_max);
        TextOut(0, (y + j) *wy, out, type);
    } //整行处理
    string = string + j * wx_max;
    len = len - j * wx_max;
    memcpy(out, string, len);
    out[len] = 0;
    TextOut(0, (y + j) *wy, out, type);
}

void tMsgPaint(int x, int y, addr string, int type)
{
    char out[wx_max + 1];
    int j, len;
    int n_wx_max;
    n_wx_max = wx_max - (x / wx); //计算每行能显示多少
    len = strlen(string);
    if (len *wx + x < n_wx_max *wx)
    {
        //不够一行
        TextOut(x, y, string, type);
        return ;
    }
    out[n_wx_max] = 0;
    for (j = 0; j < (len / n_wx_max); j++)
    {
        memcpy(out, string + j * n_wx_max, n_wx_max);
        TextOut(x, y + j * wy, out, type);
    } //整行处理
    string = string + j * n_wx_max;
    len = len - j * n_wx_max;
    if (len == 0)
    {
        return ;
    }
    memcpy(out, string, len);
    out[len] = 0;
    TextOut(x, y + j * wy, out, type);
}

//获取一段文字，放在txt处
void GetTxt(int p, int n, addr txt)
{
    char add[4];
    long j;
    int len;
    fseek(fp, oTalk + (p *(long)255+n - 1) *2, 0);
    fread(add, 1, 4, fp);
    len = (add[2] - add[0]) * (long)256 +add[3] - add[1] - 2;
    fseek(fp, oTalk + add[0] * (long)256 +add[1], 0);
    fread(txt, 1, len, fp);
    *(txt + len) = 0;
    j = 0;
    while (j < len)
    {
        j = strstr(txt + j, Ns);
        if (j != 0)
        {
            memcpy((addr)j, mem + HeroName, 6);
            j = j - (long)txt + 6;
        }
        else
        {
            j = len;
        }
    }
}

//显示一句对话，会根据主人公位置自动调整
void ShowTxt(int p, int n)
{
    int x, y;
    char txt[wx_max *2+1];
    x = 0;
    if (mem[py] > 2)
    {
        y = 0;
    }
    else
    {
        y = wy * ScrH;
    }
    Box(x, y, x + 159, y + 27, 1, 0);
    Box(x + 1, y, x + 159, y + 27, 0, 1);
    GetTxt(p, n, txt);
    tMsgPaint(x + 3, y + 2, txt, 0x43);
    DoDrawMap = TRUE;
}

//显示一句系统对话
void ShowSysTxt(int line, int n, int num, int type, int dx)
{
    int i;
    char txt[wx_max *2+1];
    for (i = 0; i < num; i++)
    {
        GetTxt(0, n + i, txt);
        tMsgPaint(1 + dx, (line + i) *wy, txt, type);
    }
}

//显示菜单的文字,根据菜单号码
void menuTxt(char id)
{
    int i;
    char txt[wx_max *2+1];
    if (MenuData[id][menu_txtnum] == 0)
    {
        return ;
    }
    for (i = 0; i < MenuData[id][menu_txtnum]; i++)
    {
        GetTxt(0, MenuData[id][menu_systxt] + i, txt);
        tMsgPaint(0, (MenuData[id][menu_txtpos] + i) *wy, txt, 3);
    }
    Refresh();
}

/////////////////////////////////////////////////////////
//修正移植带来的坐标差
void ShackScr()
{
    char i;
    for (i = 0; i < 2; i++)
    {
        XDraw(0);
        XDraw(0);
        Refresh();
        Delay(30);
        XDraw(1);
        XDraw(1);
        XDraw(1);
        XDraw(1);
        Refresh();
        Delay(30);
    }
    XDraw(0);
    XDraw(0);
    Refresh();
}

void ArtLine_1(int a, int b)
{
    int rx, ry, ax, ay;
    int i, type;
    rx = 80;
    ry = 40;
    for (type = 2; type >= 0; type = type - 2)
    {
        for (i = 45; i >= 10; i--)
        {
            ax = (long)35 * Cos(a *i * (long)573 / 10 / 10) / 1024+75;
            ay = (long)25 * Sin(b *i * (long)573 / 10 / 10) / 1024+40;
            Line(ax, ay, 80, 40, type);
            Line(ax, ay, rx, ry, type);
            rx = ax;
            ry = ay;
            Delay(20);
        }
    }
}

void ArtLine_2(int xa, int xb, int xc, int xd)
{
    //绘制随机连线
    int x, y;
    int kx, ky;
    kx = 0;
    ky = 0;
    while ((xc - xa)*(xc - xa) + (xd - xb)*(xd - xb) > 25)
    {
        x = xa;
        xa = kx * rnd(10) + x;
        y = xb;
        xb = ky * rnd(10) + y;
        if (xa <= 0)
        {
            xa = 0;
        }
        if (xb <= 0)
        {
            xb = 0;
        }
        if (xc > xa)
        {
            kx = 1;
        }
        else
        {
            kx =  - 1;
        }
        if (xd > xb)
        {
            ky = 1;
        }
        else
        {
            ky =  - 1;
        }
        Line(x, y, xa, xb, 1);
        Delay(30);
    }
    Line(xa, xb, xc, xd, 1);
}

int DelayMs(int ms)
{
    ms = ms / 4;
    do
    {
        if (Inkey())
        {
            ms = 0;
            break;
        }
    } while (((Getms() - ms0) & 255) < ms);
    ms0 = Getms();
    return ms;
}

void Rpg_Logo()
{
    int i;
    ms0 = Getms();
    for (i = 0; i < 7; i++)
    {
        ClearScreen();
        ShowPic(143+i, 80, 40, 1, MIDDLE);
        Refresh();
        if (DelayMs(60) == 0) return;
    }
    ShackScr();
    for (i = 0; i < 6; i++)
    {
        ShowPic(156, 80, 62, 1, MIDDLE);
        ShowPic(150+i, 80, 62, 4, MIDDLE);
        Refresh();
        if (DelayMs(60) == 0) return;
    }
    ShowPic(156, 80, 62, 1, MIDDLE);
    Refresh();
    DelayMs(800);
}

void Rpg_Studio()
{
    int i, j;
    int x, y;
    x = 80;
    y = 16;
    ClearScreen();
    ms0 = Getms();
    for (i = 1; i <= 7; i++)
    {
        for (j = 1; j <= i; j++)
        {
            ShowPic(94+i - j, x - j * 8, y, 1, LEFT);
            ShowPic(107-i + j, x + j * 8-8, y, 1, LEFT);
        }
        if (DelayMs(100) == 0) return;
        Refresh();
    }
    if (DelayMs(800) == 0) return;
    for (i = 0; i < 4; i++)
    {
        ShowPic(74+i, x - 56, y, 4, LEFT);
        Refresh();
        if (DelayMs(100) == 0) return;
    }
    ClearScreen();
    Refresh();
    DelayMs(150);
}

void Rpg_Title()
{
    int i;
    ms0 = Getms();
    for (i = 0; i < 9; i++)
    {
        DrawPic(1, 0, 160, 80, oTitleCG + i * 1600, 1); //绘制片头
        Refresh();
        if (DelayMs(120) == 0) break;
    }
    DrawPic(1, 0, 160, 80, oTitleCG + 9 * 1600, 1); //绘制片头
    Refresh();
    DelayMs(100);
    for (i = 10; i <= 14; i++)
    {
        DrawPic(1, 0, 160, 80, oTitleCG + i * 1600, 1); //绘制片头
        Refresh();
        DelayMs(120);
    }
    Refresh();
}

/////////////////////////////////////////////////////////
void PositionFix(addr add_map_pos, addr add_hero_pos)
{
    int j;
    mem[MapNo] = (*(add_map_pos + 1) - 64) / 16+1;
    j = addr16(add_map_pos) - 0x4000 - (long)4096 * (mem[MapNo] - 1);
    mem[MapX] = j - (j / MapW) * (long)MapW;
    mem[MapY] = j / MapW;
#if LCD_H >= 96
    if (mem[MapY] > 0)
        mem[MapY] = mem[MapY] - (LCD_H - 80) / 16;
#endif
    j = addr16(add_hero_pos) - 0x4000 - (long)4096 * (mem[MapNo] - 1);
    mem[px] = j - (j / MapW) * (long)MapW - mem[MapX];
    mem[py] = j / MapW - mem[MapY];
    mem[tpx] = mem[px];
    mem[tpy] = mem[py];
}

//检测Hp和Mp的值
void InfoFix()
{
    long max, now;
    max = addr16(mem + mHp);
    now = addr16(mem + Hp);
    if (now > max)
    {
        sum_bit16(mem + Hp, max, 0);
    }
    max = addr16(mem + mMp);
    now = addr16(mem + Mp);
    if (now > max)
    {
        sum_bit16(mem + Mp, max, 0);
    }
}

//读档
long Load(int n)
{
    //共两个存档目前
    char savefile;
    if (n > 1)
    {
        n = 1;
    }
    if (n < 0)
    {
        n = 0;
    }
#ifdef  USE_SHORT_NAME
    savefile = fopen("/LavaData/MagicSav.dat", "rb");
#else
    savefile = fopen("/LavaData/Magic_Save.dat", "rb");
#endif
    if (savefile != 0)
    {
        fseek(savefile, n *MEM_LEN, 0);
        fread(mem, 1, MEM_LEN, savefile);
        fclose(savefile);
        MsgPaint(7, 5, "存档读取成功", 0x48);
        Delay(400);
        getmap(mem[MapNo]);
        return TRUE;
    }
    else
    {
        MsgPaint(7, 5, "存档读取失败", 0x48);
        Delay(400);
        return FALSE;
    }
}

//存档目前两个
long Save(int n)
{
    char savefile;
    if (n > 1)
    {
        n = 1;
    }
    if (n < 0)
    {
        n = 0;
    }
#ifdef  USE_TI89
    savefile = fopen("/LavaData/MagicSav.dat", "rb+");
#else
    savefile = fopen("/LavaData/Magic_Save.dat", "rb+");
#endif
    if (savefile != 0)
    {
        fseek(savefile, n *MEM_LEN, 0);
        fwrite(mem, 1, MEM_LEN, savefile);
        fclose(savefile);
        MsgPaint(7, 5, "存档保存成功", 0x48);
        Delay(400);
        return TRUE;
    }
    else
    {
        MsgPaint(7, 5, "存档创建失败", 0x48);
        Delay(400);
        return FALSE;
    }
}

//根据号码画Block
void DrawBlock(int n, int x, int y, int type)
{
    WriteBlock(x * BlockW, y * BlockH, BlockW, BlockH, type, &block[n * pLen]);
}

//全部刷屏
void DrawMapFull()
{
    int x, y, s;
    int pos;
    char b;
    pos = mem[MapY] * MapW + mem[MapX];
    for (y = 0; y < LCD_H / 16; y++)
    {
        s = pos + y * MapW;
        for (x = 0; x < LCD_W / 16; x++)
        {
            b = mapdat[s];
            //地图替换
            if (b >= 224)
            {
                if (Test(mem[bInstead + b - 224], mem[MapNo]) > 0)
                {
                    b = instead[b - 224];
                }
            }
            b = mapdat[LinkL + b - 1];
            WriteBlock(x *16, y *16, 16, 16, 1, &block[b * pLen]);
            s++;
        }
    }
    DoDrawPlayer = TRUE;
}

// 绘制地图 + 人物
void DrawMap()
{
    int i, j, x, y;
    int dx, dy;
    int pf, delaytime;
    char s, dp;
    char tScr[LCD_W / 8 * LCD_H];
    char tLine[LCD_W / 8 * 16];
    char bLine[16 / 8 * LCD_H];

    DoDrawMap = FALSE;
    IsMove = FALSE;
    //人物图片地址偏移
    pf = (mem[PlayerFix] / 2) * 3 * pLen;
    //地图号变了
    if (mem[tMapNo] != mem[MapNo])
    {
        mem[tMapNo] = mem[MapNo];
        getmap(mem[MapNo]);
        IsJump = TRUE;
    }
    //跳转画法
    if (IsJump == TRUE)
    {// 直接全部绘屏
        IsJump = FALSE;
        DrawMapFull();
        mem[tMapX] = mem[MapX];
        mem[tMapY] = mem[MapY];
        mem[tpx] = mem[px];
        mem[tpy] = mem[py];
        x = mem[px] * BlockW;
        y = mem[py] * BlockH;
    }
    else
    {// 卷轴/移动绘屏
        dp = MovePixel;     //设置每次点移像素
        delaytime = 12 * dp; //设置点移后延时
        //判断是否加速
        if (CheckKey(SpeedUpKey) != 0)
        {
            dp = 8;
            delaytime = 40;
        }
        if (IsMove == FALSE && DoDrawPlayer)
        {
            s = 255;
        }
        else
        {
            s = dp;//s = 255遇到障碍人物停止, s = dp 会原地踏步
            IsMove = TRUE;
            DoDrawPlayer = TRUE;
        }
        //x向点移
        dx = mem[MapX] - mem[tMapX];
        if (dx != 0)
        {
            if (dx < 0)
            {
                x = 0;
            }
            else
            {
                x = ScrW;
            }
            i = mem[MapY] * MapW + mem[MapX] + x;
            // 保护局部
            GetBlock(8, 0, 16, LCD_H, 0, tScr);
            for (y = 0; y < LCD_H / 16; y++)
            {
                j = mapdat[i];
                //地图替换
                if (j >= 224)
                {
                    if (Test(mem[bInstead + j - 224], mem[MapNo]) > 0)
                    {
                        j = instead[j - 224];
                    }
                }
                j = mapdat[LinkL + j - 1];
                WriteBlock(8, y * 16, 16, 16, 1, &block[j * pLen]);
                i = i + MapW;
            }
            GetBlock(8, 0, 16, LCD_H, 0, tLine);
            // 恢复局部
            WriteBlock(8, 0, 16, LCD_H, 0, tScr);
            // 保存全屏
            GetBlock(0, 0, LCD_W, LCD_H, 0, tScr);
            mem[px] = mem[tpx];
            mem[py] = mem[tpy];
            s = dp;
            IsMove = TRUE;
            DoDrawPlayer = TRUE;
        }
        //Y向的点移
        dy = mem[MapY] - mem[tMapY];
        if (dy != 0)
        {
            if (dy < 0)
            {
                y = 0;
            }
            else
            {
                y = ScrH;
            }
            // 保护局部
            GetBlock(0, 0, LCD_W, 16, 0, tScr);
            i = (mem[MapY] + y) * (long)MapW + mem[MapX];
            for (x = 0; x < LCD_W / 16; x++)
            {
                j = mapdat[i];
                //地图替换
                if (j >= 224)
                {
                    if (Test(mem[bInstead + j - 224], mem[MapNo]) > 0)
                    {
                        j = instead[j - 224];
                    }
                }
                j = mapdat[LinkL + j - 1];
                WriteBlock(x * 16, 0, 16, 16, 1, &block[j * pLen]);
                i++;
            }
            GetBlock(0, 0, LCD_W, 16, 0, tLine);
            // 恢复局部
            WriteBlock(0, 0, LCD_W, 16, 0, tScr);
            // 保存全屏
            GetBlock(0, 0, LCD_W, LCD_H, 0, tScr);
            mem[px] = mem[tpx];
            mem[py] = mem[tpy];
            s = dp;
            IsMove = TRUE;
            DoDrawPlayer = TRUE;
        }
        x = mem[px] * BlockW;
        y = mem[py] * BlockH;
        dx = (mem[tpx] - mem[px]) * dp;
        dy = (mem[tpy] - mem[py]) * dp;
        if (dx !=0 || dy !=0)
        {
            s = dp;
            IsMove = TRUE;
            DoDrawPlayer = TRUE;
        #ifdef USE_TI89
            delaytime = delaytime * 3 / 2;
        #endif
        }
        // 16个点切换行走时两幅人物图
        if (IsMove)
        {
            if (++MoveStep & 1)
            {
                j = 0;
            }
            else
            {
                j = pLen;
            }
        }
        //点地图移开始
        while (s <= 16)
        {
            if (mem[MapX] > mem[tMapX])
            {
                //图像左移
                if (dp == 8)
                {
                    WriteBlock(-s, 0, LCD_W, LCD_H, 1, tScr);
                }
                else
                {
                    for (i = 0; i < dp; i++) { XDraw(0); }
                }
                WriteBlock(LCD_W - s, 0, 16, LCD_H, 1, tLine);
            }
            if (mem[MapX] < mem[tMapX])
            {
                //图像右移
                if (dp == 8)
                {
                    WriteBlock(s - 16, 0, 16, LCD_H, 1, tLine);
                    WriteBlock(s, 0, LCD_W, LCD_H, 1, tScr);
                }
                else
                {
                #if LAVA_VER >= 2
                    for (i = 0; i < dp; i++) { XDraw(1); }
                    WriteBlock(s - 16, 0, 16, LCD_H, 1, tLine);
                #else
                    WriteBlock(8 + s, 0, 16, LCD_H, 1, tLine);
                    GetBlock(24, 0, 16, LCD_H, 1, bLine);
                    WriteBlock(0, 0, 16, LCD_H, 1, bLine);
                    WriteBlock(s, 0, LCD_W, LCD_H, 1, tScr);
                #endif
                }
            }
            if (mem[MapY] > mem[tMapY])
            {
                //图像上移
                if (dp == 8 || LAVA_VER == 1)
                {
                    WriteBlock(0,  -s, LCD_W, LCD_H, 1, tScr);  //LAVA1.0 没有XDraw(2)
                }
                else
                {
                    for (i = 0; i < dp; i++) { XDraw(2); }
                }
                WriteBlock(0, LCD_H - s, LCD_W, 16, 1, tLine);
            }
            if (mem[MapY] < mem[tMapY])
            {
                //图像下移
                if (dp == 8 || LAVA_VER == 1)
                {
                    WriteBlock(0, s, LCD_W, LCD_H, 1, tScr);    //LAVA1.0 没有XDraw(3)
                }
                else
                {
                    for (i = 0; i < dp; i++) { XDraw(3); }
                }
                WriteBlock(0, s - 16, LCD_W, 16, 1, tLine);
            }
            //
            x = x + dx;
            y = y + dy;
            GetBlock(x & ~7, y, BlockW*2, BlockH, 0x01, bLine);
            WriteBlock(x, y, BlockW, BlockH, 0x04, &mask[pf + j]);
            WriteBlock(x, y, BlockW, BlockH, 0x03, &move[pf + j]);
            Refresh();
            WriteBlock(x & ~7, y, BlockW*2, BlockH, 0x01, bLine);
            //WriteBlock(x, y, BlockW, BlockH, 0x44, &mask[pf + j]);
            //WriteBlock(x, y, BlockW, BlockH, 0x43, &move[pf + j]);
        #if USE_FRAME_CTRL == 1
            while (((Getms() - ms0) & 255) * 4 < delaytime);
            ms0 = Getms();
        #else
            if (s == 16 && dx == 0 && dy == 0)
            {
                if (delaytime >= 12)
                    Delay(delaytime / 3);
            }
            else
            {
                Delay(delaytime);
            }
        #endif
            s = s + dp;/*
            if (s > 8)
            {
                j = pLen; //8个点切换行走时两幅人物图
            }*/
        }
        mem[px] = mem[tpx];
        mem[py] = mem[tpy];
        mem[tMapX] = mem[MapX];
        mem[tMapY] = mem[MapY];
    }
    //原位画图
    if (DoDrawPlayer && IsMove == FALSE)
    {
        DoDrawPlayer = FALSE;
        GetBlock(x & ~7, y, BlockW*2, BlockH, 0x01, bLine);
        WriteBlock(x, y, BlockW, BlockH, 0x04, &mask[pf + 2 * pLen]);
        WriteBlock(x, y, BlockW, BlockH, 0x03, &move[pf + 2 * pLen]);;
        Refresh();
        WriteBlock(x & ~7, y, BlockW*2, BlockH, 0x01, bLine);
        //WriteBlock(x, y, BlockW, BlockH, 0x44, &mask[pf + 2 * pLen]);
        //WriteBlock(x, y, BlockW, BlockH, 0x43, &move[pf + 2 * pLen]);;
    }
}

//模拟Suju
long suju(char n)
{
    int i, j;
    addr ptr;
    char p, s, bRun;
    int count, address, score;
    if (n == GAME_START)
    {
        //游戏片头绘制
        Inkey();
        Rpg_Logo();
        Rpg_Studio();
        Rpg_Title();
        //清零所有数据
        memset(mem + 1000, 0, MEM_LEN - 1000);
        mem[PlayerFix] = 0;
        bRun = TRUE;
        p = 1;
        do
        {
            Refresh();
            ptr = Title_Menu + 1+(p - 1) *4;
            Box(*ptr, *(ptr + 1), *(ptr + 2), *(ptr + 3), 1, 2);
            Key = KeyPause(200);
            if (Key == KEY_LEFT || Key == KEY_UP)
            {
                if (p > 1)
                {
                    p--;
                }
                else
                {
                    p = Title_Menu[0];
                }
            }
            else if (Key == KEY_RIGHT || Key == KEY_DOWN)
            {
                if (p < Title_Menu[0])
                {
                    p++;
                }
                else
                {
                    p = 1;
                }
            }
            else if (Key == KEY_ENTER || Key == KEY_F1)
            {
                if (p == 4)
                {
                    //退出
                    suju(EXIT_GAME);
                }
                else if (p == 3)
                {
                    //制作组
                    ClearScreen();
                    ShowSysTxt(0, 22, 6, 1, +2);
                    Refresh();
                    WaitKey();
                    Rpg_Title();
                }
                else if (p == 2)
                {
                    //读取
                    if (suju(LOAD_GAME) == TRUE)
                    {
                        bRun = FALSE;
                    }
                    else
                    {
                        Rpg_Title();
                    }
                }
                else if (p == 1)
                {
                    //建立人物
                    bRun = FALSE;
                    /***********************
                    //普通方法表示的游戏坐标
                    mem[MapNo]=1;
                    mem[tpx]=5;
                    mem[tpy]=4;
                    mem[MapX]=0;
                    mem[MapY]=0;
                    mem[tMapX]=1;
                    mem[tMapY]=1;
                     ***********************/
                    //神州的数据坐标
                    poke(4955, 204);
                    poke(4956, 96);
                    poke(4957, 100);
                    poke(4958, 97);
                    poke(4961, 3);
                    PositionFix(mem + MapX, mem + px);

                    //[poke数据]////////////////////////////////////////////////
                    //poke(4784,42);
                    //poke(4785,18);//头像地址，目前没用
                    //memcpy(mem+mHeroHead,ActorHead,128);//拷贝头像地址

                    poke(4786, 4);
                    poke(4787, 5);
                    poke(4788, 10);
                    poke(4789, 12);
                    poke(4790, 10); //REM 攻防敏魔抗

                    poke(4791, 130);
                    poke(4793, 40);
                    poke(4848, 100);
                    poke(4883, 5); //当前HP,MP 金钱,道具

                    poke(4797, 1);
                    poke(4842, 130);
                    poke(4844, 40);
                    poke(4846, 7); //级别,HP,MP,EXP最大值

                    poke(4817, 64);
                    poke(4818, 160);
                    poke(4819, 120);
                    poke(4820, 90);
                    poke(4821, 120);
                    poke(4822, 80); //图象首地址和属性增加值

                    poke(5034, 240);
                    poke(5033, 91);
                    poke(5032, 221);
                    poke(5031, 255);
                    poke(5030, 254);
                    poke(5014, 102); //游戏开关
                    //////////////////////////////////////////////////////////////
                    /*poke(4786,200);
                    sum_bit16(mem+mHp,5000,0);
                    sum_bit16(mem+mMp,5000,0);
                    sum_bit16(mem+Hp,5000,0);
                    sum_bit16(mem+Mp,5000,0);
                    sum_bit16(mem+Money,50000,0);*/
                    //for(i=4824;i<=4833;i++) poke(i,20);//写入所有魔法
                    //poke(4919,1);//飞天御云珠
                    //for(i=0;i<64;i++) poke(memfix+sItemA_b+i,20);//写入所有道具
                    /////////////////////////////////////////////////////////////////
                    mem[tpx] = mem[px];
                    mem[tpy] = mem[py];
                    suju(CREAT_HERO);
                    ms0 = Getms();
                    for (i = 0; i < 18; i++)
                    {
                        ShowPic(114, 1, 0, 1, LEFT);
                        ShowSysTxt(1, 133+i, 4, 3, +2);
                        Refresh();
                        if (DelayMs(500) == 0) return TRUE;
                    }
                    WaitKey();
                }
            } //按键检测循环
        } while (bRun == TRUE); //菜单循环结束
        return TRUE;
    }
    else if (n == CREAT_HERO)
    {
        //新建英雄
        ClearScreen();
        ShowPic(166, 80, 40, 1, MIDDLE);
        ShowPic(109, 64, 0, 1, LEFT);
        GetBlock(64, 0, 32, 32, 0, mem + mHeroHead);
        Refresh();
        //getchar();
        strcpy(mem + HeroName, "阿诗");
        Input(mem + HeroName, 62, 34, 6);
        fstr(mem + HeroName, 6, MIDDLE, 32);
        return TRUE;
    }
    else if (n == SAVE_GAME)
    {
        //储存档案
        i = pID;
        pID++;
        IDstack[pID] = 14;
        ShowPic(114, 1, 0, 1, LEFT);
        MsgPaint(8, 2, "储存进度一", 3);
        MsgPaint(8, 3, "储存进度二", 3);
        Refresh();
        menudraw(IDstack[pID]);
        for (j = i + 1; j <= pID; j++)
        {
            ENstack[j] = FALSE;
        }
        j = pID;
        pID = i; //恢复菜单ID
        if (j == i)
        {
            return FALSE;
        }
        else
        {
            return Save(IDstack[j]);
        }
    }
    else if (n == LOAD_GAME)
    {
        i = pID;
        pID++;
        IDstack[pID] = 15;
        ShowPic(114, 1, 0, 1, LEFT);
        MsgPaint(8, 2, "读取进度一", 3);
        MsgPaint(8, 3, "读取进度二", 3);
        Refresh();
        menudraw(IDstack[pID]);
        for (j = i + 1; j <= pID; j++)
        {
            ENstack[j] = FALSE;
        }
        j = pID;
        pID = i;
        if (j == i)
        {
            return FALSE;
        }
        else
        {
            return Load(IDstack[j]);
        }
    }
    else if (n == END_GAME)
    {
        for (i = 105; i <= 126; i++)
        {
            ShowPic(140, 1, 0, 1, LEFT);
            ShowSysTxt(0, i, 6, 3, +0);
            Refresh();
            Delay(400);
        }
        Delay(1000);
        WaitKey();
        //过关评价
        count = 0;
        score = 0;
        ShowPic(140, 1, 0, 1, LEFT);
        MsgPaint(5, 0, "数据统计中...", 1);
        Refresh();
        for (i = 0; i < 7; i++)
        {
            address = Event_Test[i][0] * (long)100 +Event_Test[i][1] - memfix;
            for (j = 1; j <= 8; j++)
            {
                if (Test(mem[address], j) > 0)
                {
                    s = 1;
                }
                else
                {
                    s = 0;
                }
                if (s != Event_Test[i][1+j] && Event_Test[i][1+j] < 2)
                {
                    count++;
                }
            }
        }
        if (count > 36)
        {
            count = 36;
        }
        score = score + (count * (long)100 / 36);
        str(count * (long)100 / 36);
        MsgPaint(5, 1, "剧情完成度:    %", 1);
        MsgPaint(17, 1, str_num, 3);
        Refresh();
        Delay(500);
        count = 0;
        for (i = 5035; i <= 5049; i++)
        {
            for (j = 1; j <= 6; j++)
            {
                if (Test(mem[i - memfix], j) > 0)
                {
                    count++;
                }
            }
        }
        if (count > 75)
        {
            count = 75;
        }
        score = score + (count * (long)100 / 75);
        str(count * (long)100 / 75);
        MsgPaint(5, 2, "道具找寻度:    %", 1);
        MsgPaint(17, 2, str_num, 3);
        Refresh();
        Delay(200);
        count = 0;
        for (i = 4824; i <= 4833; i++)
        {
            if (mem[i - memfix] > 0)
            {
                count++;
            }
        }
        score = score + count * (long)10;
        str(count * (long)10);
        MsgPaint(5, 3, "法术习得度:    %", 1);
        MsgPaint(17, 3, str_num, 3);
        Refresh();
        Delay(200);
        count = 0;
        for (i = 4918; i <= 4927; i++)
        {
            if (mem[i - memfix] > 0)
            {
                count++;
            }
        }
        score = score + count * (long)100 / 9;
        str(count * (long)100 / 9);
        MsgPaint(5, 4, "宝物获得度:    %", 1);
        MsgPaint(17, 4, str_num, 3);
        Refresh();
        Delay(300);
        MsgPaint(5, 5, "按任意键继续...", 1);
        Refresh();
        Delay(100);
        WaitKey();
        ShowPic(140, 1, 0, 1, LEFT);
        MsgPaint(5, 1, "综合评价...", 1);
        Refresh();
        Delay(500);
        score = score + mem[Level];
        if (score > 480)
        {
            //S
            count = 161;
        }
        else if (score > 450)
        {
            //A
            count = 157;
        }
        else if (score > 330)
        {
            //B
            count = 158;
        }
        else if (score > 200)
        {
            //C
            count = 159;
        }
        else
        {
            count = 160;
        } //D
        for (i = 0; i < 4; i++)
        {
            ShowPic(count, 80, 40, 1, MIDDLE);
            ShowPic(165-i, 80, 40, 4, MIDDLE);
            Refresh();
            Delay(50);
        }
        ShowPic(count, 80, 40, 1, MIDDLE);
        Refresh();
        WaitKey();
        ShowPic(140, 1, 0, 1, LEFT);
        ShowPic(108, 80, 40, 1, MIDDLE);
        Refresh();
        Delay(2000);
        WaitKey();
        //隐藏剧情
        if (count == 157 || count == 161)
        {
            poke(4955, 128);
            poke(4956, 162);
            poke(4957, 26);
            poke(4958, 163);
            poke(4961, 7);
            sum_bit16(mem + Hp, 0, addr16(mem + mHp));
            sum_bit16(mem + Mp, 0, addr16(mem + mMp));
            poke(4885, 100);
            poke(4889, 50);
            poke(4890, 100);
            PositionFix(mem + MapX, mem + px);
            IsJump = TRUE;
        }
        else
        {
            exit(0);
        }
    }
    else if (n == EXIT_GAME)
    {
        //退出游戏
        ClearScreen();
        fclose(fp);
        for (j = 0; j < 2; j++)
        {
            for (i = 0; i < 40; i++)
            {
                Line(0, i *2+j, 159, i *2+j, 0);
                Delay(10);
            }
        }
        exit(0);
        return FALSE;
    }
    else if (n == GAME_OVER)
    {
        ClearScreen();
        Refresh();
        tMsgPaint(3 *8, 2 *16, " GAME OVER... ", 0xC1);
        Delay(1000);
        return FALSE;
    }
    return FALSE;
}

//事件解析子程序,把事件代码赋值给mem[EventDat]就可以解析。
void Translate()
{
    char tKey; //临时按键
    char tYNScr[112]; //临时屏幕储存
    char eDat[257]; //多定义一个
    char tScr[1600]; //临时屏幕储存
    int tAdd; //临时地址储存
    long i, j, k; //循环变量
    //交易菜单用
    char Item_tmp[2]; //道具信息暂存
    int Item_b;
    int Item_e;
    long Item_offset; //道具信息偏移
    char menuID;
    char pID_b; //pID储存
    char IfMenuDraw; //是否画菜单
    int x, y;
    char eName[11]; //道具名字
    char tItemInfo[item_info_l + 1];
    long NowMoney;
    ///////////
    memcpy(eDat, mem + mEventDat, 256);
    i = 0;
    eDat[256] = 0xFF;
    IfMove = FALSE;
    //判断回车按键相关
    if (eDat[i] == 26)
    //是不是回车键触发的
    {
        if (IsEnter == TRUE)
        {
            mem[tpx] = mem[px];
            mem[tpy] = mem[py];
            i = i + 1;
        }
        else
        {
            i = 256;
        }
    }
    else if (IsEnter == TRUE)
    //回车触发非26号
    {
        i = 256;
    }
    //事件解析～开始～
    while (eDat[i] != 0 && eDat[i] < MaxEventNo)
    {
        if (eDat[i] == 1)
        {
            //对话
            ShowTxt(1, eDat[i + 1]);
            KeyPause(300);
            i = i + 2;
        }
        else if (eDat[i] == 2)
        {
            //Poke
            tAdd = addr10(eDat + i + 1) - memfix;
            mem[tAdd] = eDat[i + 3];
            i = i + 4;
        }
        else if (eDat[i] == 3)
        {
            tAdd = addr10(eDat + i + 1) - memfix;
            mem[tAdd] = mem[tAdd] | (1 << eDat[i + 3] - 1);
            i = i + 4;
        }
        else if (eDat[i] == 4)
        {
            tAdd = addr10(eDat + i + 1) - memfix;
            mem[tAdd] = mem[tAdd] &(255-(1 << eDat[i + 3] - 1));
            i = i + 4;
        }
        else if (eDat[i] == 5)
        {
            tAdd = addr10(eDat + i + 1) - memfix;
            if (mem[tAdd] == eDat[i + 3])
            {
                i = i + 4+eDat[i + 4];
            }
            else
            {
                if (eDat[i + 5] == 127)
                {
                    i = i + 6+eDat[i + 6];
                }
                else
                {
                    i = 256;
                    break;
                }
            }
        }
        else if (eDat[i] == 6)
        {
            tAdd = addr10(eDat + i + 1) - memfix;
            if (mem[tAdd] > eDat[i + 3])
            {
                i = i + 4+eDat[i + 4];
            }
            else
            {
                if (eDat[i + 5] == 127)
                {
                    i = i + 6+eDat[i + 6];
                }
                else
                {
                    i = 256;
                    break;
                }
            }
        }
        else if (eDat[i] == 7)
        {
            tAdd = addr10(eDat + i + 1) - memfix;
            if (mem[tAdd] < eDat[i + 3])
            {
                i = i + 4+eDat[i + 4];
            }
            else
            {
                if (eDat[i + 5] == 127)
                {
                    i = i + 6+eDat[i + 6];
                }
                else
                {
                    i = 256;
                    break;
                }
            }
        }
        else if (eDat[i] == 8)
        {
            //判断开关情况
            tAdd = addr10(eDat + i + 1) - memfix;
            if (Test(mem[tAdd], eDat[i + 3]) > 0)
            {
                i = i + 4+eDat[i + 4];
            }
            else
            {
                if (eDat[i + 5] == 127)
                {
                    i = i + 6+eDat[i + 6];
                }
                else
                {
                    i = 256;
                    break;
                }
            }
        }
        else if (eDat[i] == 9)
        {
            //调用数据
            if (suju(eDat[i + 1]) == FALSE && eDat[i + 1] == GAME_OVER)
            {
                exit(0);
            }
            i = i + 2;
        }
        else if (eDat[i] == 10)
        {
            //交易菜单循环
            pID++;
            pID_b = pID;
            IDstack[pID] = 26; //26号示买卖菜单
            menuID = IDstack[pID];
            do
            {
                NowMoney = addr16(mem + Money); //现有金钱
                str(NowMoney);
                fstr(str_num, 5, MIDDLE, 32);
                wx = 6;
                wy = 13;
                IfMenuDraw = TRUE;
                if (menuID == 26)
                {
                    //买卖菜单
                    ShowPic(113, 1, 0, 1, LEFT); //显示菜单框架
                    tMsgPaint(120, 18, str_num, 3); //显示钱
                    Refresh();
                }
                else if (menuID == 27)
                {
                    //买道具列表,暂时以oItemA连续来写
                    ShowPic(113, 1, 0, 1, LEFT);
                    tMsgPaint(120, 18, str_num, 3);
                    Item_offset = oItemA;
                    x = 9;
                    y = 1;
                    MenuData[menuID][menu_max] = eDat[i + 1];
                    MenuData[menuID][menu_id_next] = 100; //买道具起始ID
                    for (j = 0; j < eDat[i + 1]; j++)
                    {
                        fseek(fp, Item_offset + (eDat[i + 3+j] - 1) * (long)ItemLen, 0);
                        fread(Item_tmp, 1, 2, fp); //储存图像号码
                        DrawPic(x, y, 16, 16, oItemPic + Item_tmp[1] * (long)32, 3);
                        x = x + 16;
                        if (x >= 105)
                        {
                            x = 8;
                            y = y + 16;
                        }
                    } //画道具图像
                    wx = 8;
                    wy = 16;
                }
                else if (menuID == 28)
                {
                    //卖出目录
                    ShowPic(113, 1, 0, 1, LEFT);
                    MsgPaint(6, 1, "普通道具", 1);
                    MsgPaint(6, 2, "法术道具", 1);
                    MsgPaint(6, 3, "材料装备", 1);
                    tMsgPaint(120, 18, str_num, 3); //显示钱
                    MenuData[menuID][menu_max] = 3;
                    Refresh();
                }
                else if (menuID == 29)
                {
                    //离开
                    break;
                }
                else if (menuID == 30 || menuID == 31 || menuID == 32)
                {
                    //卖道具列表
                    ShowPic(113, 1, 0, 1, LEFT);
                    tMsgPaint(120, 18, str_num, 3);
                    if (menuID == 30)
                    {
                        Item_b = sItemA_b;
                        Item_e = sItemA_e;
                        Item_offset = oItemA;
                    }
                    else if (menuID == 31)
                    {
                        Item_b = sItemD_b;
                        Item_e = sItemD_e;
                        Item_offset = oItemD;
                    }
                    else if (menuID == 32)
                    {
                        Item_b = sItemB_b;
                        Item_e = sItemB_e;
                        Item_offset = oItemB;
                    }
                    x = 9;
                    y = 1;
                    k = 0;
                    for (j = 0; j <= (Item_e - Item_b); j++)
                    {
                        if (mem[Item_b + j] != 0)
                        {
                            fseek(fp, Item_offset + j * (long)ItemLen, 0);
                            fread(Item_tmp, 1, 2, fp); //储存图像号码
                            DrawPic(x, y, 16, 16, oItemPic + Item_tmp[1] *(long)32, 3);
                            x = x + 16;
                            if (x >= 105)
                            {
                                x = 9;
                                y = y + 16;
                            }
                            k++;
                        }
                    } //画道具图像
                    if (k > 0)
                    {
                        menuID = 30;
                        MenuData[menuID][menu_max] = k;
                        MenuData[menuID][menu_id_next] = 150; //卖道具起始ID
                        wx = 8;
                        wy = 16;
                    }
                    else
                    {
                        IfMenuDraw = FALSE;
                    }
                }
                else if (menuID >= 100 && menuID < 150)
                {
                    j = eDat[i + 3+menuID - 100] - 1;
                    fseek(fp, Item_offset + j * (long)ItemLen + item_cost, 0);
                    fread(Item_tmp, 1, item_cost_l, fp); //储存图像号码
                    fseek(fp, Item_offset + j * (long)ItemLen + item_name, 0);
                    fread(eName, 1, item_name_l, fp); //储存道具名字
                    fseek(fp, Item_offset + j * (long)ItemLen + item_info, 0);
                    fread(tItemInfo, 1, item_info_l, fp); //储存道具名字
                    tItemInfo[item_info_l] = 0; //读取道具信息
                    Box(0, 0, 160, 28, 1, 0);
                    Box(1, 0, 160, 28, 0, 1);
                    tMsgPaint(3, 2, tItemInfo, 0x43);
                    j = strchr(eName, 32);
                    if (j != 0)
                    {
                         *(addr)j = 0;
                    }
                    fstr(eName, 10, MIDDLE, 32); //显示名字
                    j = addr16(Item_tmp) * eDat[i + 2] / 100; //道具花费
                    str(j);
                    fstr(str_num, 5, MIDDLE, 32);
                    MsgPaint(5, 5, "价格:", 0x41);
                    MsgPaint(10, 5, str_num, 0x41);
                    MsgPaint(5, 4, eName, 0x41);
                    tMsgPaint(5 *wx, 33, "买下?[Y/N]", 0x48);
                    tKey = WaitKey();
                    if (tKey == KEY_Y || tKey == KEY_F1)
                    {
                        if (NowMoney >= j)
                        {
                            //eDat[i+3+menuID-100]-1是道具号码
                            if (mem[sItemA_b + eDat[i + 3+menuID - 100] - 1] < 255)
                            {
                                add_bit16(mem + Money,  - j);
                                tMsgPaint(5 *wx, 33, " 交易成功 ", 0x48);
                                mem[sItemA_b + eDat[i + 3+menuID - 100] - 1]++;
                            }
                            else
                            {
                                tMsgPaint(5 *wx, 33, "道具箱满了", 0x48);
                            }
                        }
                        else
                        {
                            tMsgPaint(5 *wx, 33, "您的钱不够", 0x48);
                        }
                        Delay(300);
                    } //道具按键循环结束
                    IfMenuDraw = FALSE;
                }
                else if (menuID >= 150)
                {
                    j = 0;
                    for (k = 0; k <= (Item_e - Item_b); k++)
                    {
                        if (mem[Item_b + k] != 0)
                        {
                            j++;
                        }
                        if (j - 1 == menuID - 150)
                        {
                            break;
                        }
                    }
                    j = k; //获取道具号码
                    fseek(fp, Item_offset + j * (long)ItemLen + item_cost, 0);
                    fread(Item_tmp, 1, item_cost_l, fp); //储存图像号码
                    fseek(fp, Item_offset + j * (long)ItemLen + item_name, 0);
                    fread(eName, 1, item_name_l, fp); //储存道具名字
                    menuID = k; //道具号码转移
                    j = strchr(eName, 32);
                    if (j != 0)
                    {
                         *(addr)j = 0;
                    }
                    fstr(eName, 10, MIDDLE, 32); //显示名字
                    j = addr16(Item_tmp) *6 / 10; //道具花费
                    str(j);
                    fstr(str_num, 5, MIDDLE, 32);
                    MsgPaint(5, 5, "价格:", 0x41);
                    MsgPaint(10, 5, str_num, 0x41);
                    MsgPaint(5, 4, eName, 0x41);
                    tMsgPaint(5 *wx, 33, "卖出?[Y/N]", 0x48);
                    tKey = WaitKey();
                    if (tKey == KEY_Y || tKey == KEY_F1)
                    {
                        if (sum_bit16(mem + Money, NowMoney, j) == TRUE)
                        {
                            tMsgPaint(5 *wx, 33, " 交易成功 ", 0x48);
                            mem[Item_b + menuID]--;
                        }
                        else
                        {
                            tMsgPaint(5 *wx, 33, " 钱箱已满 ", 0x48);
                        }
                        Delay(300);
                    } //卖出道具按键循环结束
                    IfMenuDraw = FALSE;
                }
                if (IfMenuDraw == TRUE)
                {
                    menudraw(menuID);
                }
                else
                {
                    pID--;
                }
                menuID = IDstack[pID];
            } while (pID >= pID_b); //菜单循环结束
            for (j = pID_b; j <= pID; j++)
            {
                ENstack[j] = FALSE;
            }
            pID = pID_b - 1;
            i = i + eDat[i + 1] + 3;
            IsJump = TRUE;
            IsEnter = FALSE;
        }
        else if (eDat[i] == 11)
        {
            //可以行走
            IfMove = TRUE;
            i++;
        }
        else if (eDat[i] == 12)
        {
            //"经验值增加，请用27号事件代替，未被模拟"
            i = i + 4;
        }
        else if (eDat[i] == 13)
        {
            Refresh();
            GetBlock(1, 0, 160, 79, 0x40, tScr);
            tAdd = (eDat[i + 1] * (long)256 +eDat[i + 2] - 0x4000) / 32;
            for (j = 0; j < eDat[i + 3]; j++)
            {
                WriteBlock(0, 0, 160, 80, 1, tScr);
                Refresh();
                DrawBlock(tAdd, eDat[i + 4+j * 2], eDat[i + 5+j * 2], 0x41);
                Delay(200);
            }
            i = i + 4+eDat[i + 3] *2;
        }
        else if (eDat[i] == 14)
        {
            //存屏幕
            GetBlock(1, 0, 160, 79, 0x40, tScr);
            i = i + 1;
        }
        else if (eDat[i] == 15)
        {
            //读屏幕
            WriteBlock(0, 0, 160, 80, 1, tScr);
            Refresh();
            i = i + 1;
        }
        else if (eDat[i] == 17 || eDat[i] == 16)
        {
            //拖屏一格
            i++;
            if (IfMove == TRUE)
            {
                if (Key == KEY_LEFT && mem[tpx] < ScrollH && mem[MapX] > 0)
                {
                    mem[MapX]--;
                    mem[tpx]++;
                }
                if (Key == KEY_UP && mem[tpy] < ScrollV && mem[MapY] > 0)
                {
                    mem[MapY]--;
                    mem[tpy]++;
                }
                if (Key == KEY_RIGHT && mem[tpx] > ScrW - ScrollH && mem[MapX] < MapW - ScrW)
                {
                    mem[MapX]++;
                    mem[tpx]--;
                }
                if (Key == KEY_DOWN && mem[tpy] > ScrH - ScrollV && mem[MapY] < MapH - ScrH)
                {
                    mem[MapY]++;
                    mem[tpy]--;
                }
            }
        }
        else if (eDat[i] == 18)
        {
            //刷屏幕
            mem[px] = mem[tpx];
            mem[py] = mem[tpy];
            IsJump = TRUE;
            DrawMap();
            i++;
        }
        else if (eDat[i] == 19)
        {
            //事件连接代码
            IfLink = TRUE;
            i++;
        }
        else if (eDat[i] == 20)
        {
            //"运行汇编，不建议使用，未被模拟"
            i = i + eDat[i + 1];
        }
        else if (eDat[i] == 21)
        {
            //进门存坐标
            mem[sMapNo] = mem[MapNo];
            for (j = 0; j < 5; j++)
            {
                mem[tBegin + j] = mem[MapX + j];
            }
            i = i + 1;
        }
        else if (eDat[i] == 22)
        {
            //战斗
            mem[nBattleMon] = eDat[i + 1];
            i = i + 2;
        }
        else if (eDat[i] == 23)
        {
            //【Y/N】事件
            GetBlock(48, 30, 64, 14, 0x40, tYNScr);
            tMsgPaint(48, 30, "是/否[Y/N]", 0x49);
            do
            {
                tKey = CheckKey(128);
            } while(tKey == 0);
            WriteBlock(48, 30, 64, 14, 0x41, tYNScr);
            if (tKey == KEY_Y || tKey == KEY_F1)
            {
                i = i + 1+eDat[i + 1];

            }
            else if (eDat[i + 2] == 127)
            {
                i = i + 3+eDat[i + 3];
            }
            else
            {
                i = 256;
                break;
            }
        }
        else if (eDat[i] == 24)
        {
            //休息
            sum_bit16(mem + Hp, 0, addr16(mem + mHp));
            sum_bit16(mem + Mp, 0, addr16(mem + mMp));
            //魔法没有清零^_^bb
            i = i + 1;
        }
        else if (eDat[i] == 25)
        {
            //坐标跳转
            PositionFix(eDat + i + 1, eDat + i + 3);
            IsJump = TRUE;
            mem[tpx] = mem[px];
            mem[tpy] = mem[py];
            i = i + 5;
        }
        else if (eDat[i] == 26)
        {
            //回车事件
            i++;
        }
        else if (eDat[i] == 27)
        {
            //增加
            tAdd = addr10(eDat + i + 2) - memfix;
            if (eDat[i + 1] == 1)
            {
                add_bit8(mem + tAdd, eDat[i + 4]);
            }
            else
            {
                add_bit16(mem + tAdd, eDat[i + 4]);
            }
            i = i + 5;
        }
        else if (eDat[i] == 28)
        {
            //减少
            tAdd = addr10(eDat + i + 2) - memfix;
            if (eDat[i + 1] == 1)
            {
                add_bit8(mem + tAdd,  - eDat[i + 4]);
            }
            else
            {
                add_bit16(mem + tAdd,  - eDat[i + 4]);
            }
            i = i + 5;
        }
        else if (eDat[i] == 29)
        {
            //出门事件
            IsJump = TRUE;
            mem[MapNo] = mem[sMapNo];
            for (j = 0; j < 5; j++)
            {
                mem[MapX + j] = mem[tBegin + j];
            }
            mem[tpx] = mem[px];
            mem[tpy] = mem[py];
            i = i + 1;
        }
        else if (eDat[i] == 30)
        {
            //旁白事件
            Box(0, 0, 160, 79, 1, 0);
            ShowSysTxt(0, eDat[i + 1], 6, 0x43, +0);
            KeyPause(300);
            i = i + 2;
        }
        else if (eDat[i] == 31)
        {
            //连续对话
            for (j = 0; j < eDat[i + 2]; j++)
            {
                ShowTxt(1, eDat[i + 1] + j);
                KeyPause(300);
            }
            i = i + 3;
        }
        else if (eDat[i] == 32)
        {
            //清屏，黑1白0
            Block(0, 0, 160, 80, eDat[i + 1]);
            for (j = 1; j <= 8; j++)
            {
                Box(80-j * 10, 40-j * 5, 80+j * 10, 40+j * 5, 1, eDat[i + 1]);
            }
            i = i + 2;
        }
        else if (eDat[i] == 33)
        {
            //新的单句对话
            ShowTxt(eDat[i + 1], eDat[i + 2]);
            KeyPause(300);
            i = i + 3;
        }
        else if (eDat[i] == 34)
        {
            //新的连续对话
            for (j = 0; j < eDat[i + 3]; j++)
            {
                ShowTxt(eDat[i + 1], eDat[i + 2] + j);
                KeyPause(300);
            }
            i = i + 4;
        }
        else if (eDat[i] == 35)
        {
            //新的战斗设定
            //三个参数，格式：[35],[x个怪物一个循环],[n级一个循环],[r遇怪频率]
            //目前怪物总数74个
            mem[sBattle] = eDat[i + 3];
            tAdd = mem[Level] / eDat[i + 2];
            for (j = 0; j < 3; j++)
            {
                mem[nMonster + j] = eDat[i + 1] * (long)tAdd + rnd(eDat[i + 1]);
            }
            i = i + 4;
        }
        else if (eDat[i] == 36)
        {
            //随机连续对话
            //四个参数，格式：[36],[x个循环],[页数],[起始对话号码],[对话数量]
            tAdd = rnd(eDat[i + 1]) * eDat[i + 4];

            for (j = 0; j < eDat[i + 4]; j++)
            {
                ShowTxt(eDat[i + 2], eDat[i + 3] + j + tAdd);
                KeyPause(300);
            }
            i = i + 5;
        }
        else if (eDat[i] == 37)
        {
            //随机打开开关
            tAdd = addr10(eDat + i + 1) - memfix;
            j = rnd(8);
            mem[tAdd] = mem[tAdd] | (1 << j);
            i = i + 3;
        }
        else if (eDat[i] == 38)
        {
            //打造事件38,概率(1-100),经验奖励,打造物品号码高,低,耗材种类,耗材1,数量,....
            //打造成功对话:255,失败:254,不足:253。第三页
            //   ShowTxt(eDat[i+1],eDat[i+2]);
            //   KeyPause(300);
            k = TRUE;
            for (j = 0; j < eDat[i + 5]; j++)
            {
                tAdd = addr10(eDat + i + 6+j * 3) - memfix;
                if (mem[tAdd] < eDat[i + 6+j * 3+2])
                {
                    k = FALSE;
                }
            }
            if (k != FALSE)
            {
                for (j = 0; j < eDat[i + 5]; j++)
                {
                    tAdd = addr10(eDat + i + 6+j * 3) - memfix;
                    add_bit8(mem + tAdd,  - eDat[i + 6+j * 3+2]);
                }
                if (rnd(100) < eDat[i + 1])
                {
                    //合成成功
                    add_bit16(mem + Exp, eDat[i + 2]);
                    tAdd = addr10(eDat + i + 3) - memfix;
                    add_bit8(mem + tAdd, 1);
                    ShowTxt(3, 255);
                    WaitKey();
                }
                else
                {
                    //合成失败
                    add_bit16(mem + Exp, eDat[i + 2] / 3);
                    ShowTxt(3, 254);
                    WaitKey();
                }
            }
            else
            {
                ShowTxt(3, 253);
                WaitKey();
            }
            i = i + 6+eDat[i + 5] *3;
        }
        //else
        //{
        // i++;
        //}
    }
    if (IfMove == FALSE)
    {
        mem[tpx] = mem[px];
        mem[tpy] = mem[py];
    }
}

//由魔法号绘制魔法，返回伤害和鉴定
long Magic(int n, addr damage_address, addr sBattle_Enemy, addr tScr)
{
    int i, j, k;
    int p, s;
    int rx, ry;
    char rate[2]; //在显示怪物属性的时候用
    if (n == 101)
    {
        //普通攻击1
        for (i = 0; i < 3; i++)
        {
            ShowPic(33, 65+i * 5, 25+i * 5, 0, LEFT);
            Refresh();
        }
        ShackScr();
        return NO_TEST;
    }
    else if (n == 102)
    {
        //普通攻击2
        for (i = 0; i < 3; i++)
        {
            ShowPic(35, 58+i * 7, 15+i * 8, 0, LEFT);
            Refresh();
        }
        ShackScr();
        return NO_TEST;
    }
    else if (n == 103)
    {
        //奋力一击
        for (i = 1; i <= 3; i++)
        {
            rx = rnd(20);
            ry = rnd(50);
            for (j = 0; j < 3; j++)
            {
                ShowPic(41+j * 2, rx + i * 25, ry, 0, LEFT);
                Refresh();
            }
            ShackScr();
        }
        return NO_TEST;
    }
    else if (n == 1)
    {
        CanShowHpMp = TRUE;
        //魔法一（怪物资料列表）
        ClearScreen();
        ShowPic(135, 50, 31, 1, MIDDLE);
        for (i = 0; i < 5; i++)
        {
            str(addr16(sBattle_Enemy + b_ATK + i * 2));
            fstr(str_num, 5, MIDDLE, 32);
            tMsgPaint(54, i *13, str_num, 1);
        }
        str(addr16(sBattle_Enemy + b_Hp));
        fstr(str_num, 5, MIDDLE, 32);
        MsgPaint(4, 5, "生命:", 1);
        MsgPaint(9, 5, str_num, 1);
        str(addr16(sBattle_Enemy + b_Mp));
        fstr(str_num, 5, MIDDLE, 32);
        MsgPaint(15, 5, "内力:", 1);
        MsgPaint(20, 5, str_num, 1);
        //绘制血槽
        ShowPic(141, 112, 3, 1, LEFT);
        ShowPic(142, 128, 3, 1, LEFT);
        i = 0;
        if (sum_bit16(rate, addr16(sBattle_Enemy + b_mHp),  -addr16(sBattle_Enemy + b_Hp)) == TRUE)
        {
            i = addr16(rate);
        }
        if (i != 0)
        {
            Block(114, 7, 116, 6+i * 50 / addr16(sBattle_Enemy + b_mHp), 0);
        }
        i = 0;
        if (sum_bit16(rate, addr16(sBattle_Enemy + b_mMp),  -addr16(sBattle_Enemy + b_Mp)) == TRUE)
        {
            i = addr16(rate);
        }
        if (i != 0)
        {
            Block(130, 7, 132, 6+i * 50 / addr16(sBattle_Enemy + b_mMp), 0);
        }
        Refresh();
        WaitKey();
        WriteBlock(0, 0, 160, 80, 1, tScr);
        MsgPaint(8, 5, sBattle_Enemy + b_NAME, 1);
        Refresh();
        sum_bit16(damage_address, 0, 0);
        Delay(800);
        return NO_TEST;
    }
    else if (n == 2)
    {
        // 魔法二（会心一击）
        for (i = 100; i >= 0; i--)
        {
            Point(i, 40, 1);
            Point(160-i, 40, 1);
            Point(i + 35, 40, 0);
            Point(125-i, 40, 0);
        }
        for (i = 140; i >= 80; i = i - 10)
        {
            Ellipse(i, 40, 10, 8, 1, 1);
            Ellipse(160-i, 40, 10, 8, 1, 1);
            Ellipse(i + 7, 40, 10, 8, 1, 0);
            Ellipse(153-i, 40, 10, 8, 1, 0);
        }
        for (i = 1; i <= 12; i++)
        {
            Circle(80, 40, i, 0, 0);
        }
        for (i = 13; i <= 18; i = i + 2)
        {
            Circle(80, 40, i, 0, 1);
        }
        for (i = 15; i <= 45; i = i + 5)
        {
            Ellipse(80, i - 10, 2, 10, 0, 0);
            Ellipse(80, i - 15, 6, 2, 0, 0);
            Ellipse(80, i, 2, 10, 0, 1);
            Ellipse(80, i - 5, 6, 2, 0, 1);
        }
        for (i = 15; i <= 22; i++)
        {
            Circle(80, 35, i, 0, 1);
        }
        for (i = 22; i >= 0; i--)
        {
            Circle(80, 35, i, 0, 0);
        }
        for (j = 0; j < 3; j++)
        {
            ShowPic(41+j * 2, 80, 35, 0x40, MIDDLE);
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        ShackScr();
        sum_bit16(damage_address, rnd(10), 130);
        return FULL_TEST;
    }
    else if (n == 3)
    {
        //魔法三 御波逐浪
        Box(1, 0, 160, 80, 1, 2);
        Box(1, 0, 160, 80, 1, 2);
        ShowPic(13, 40, 0, 0, LEFT);
        Refresh();
        Delay(50);
        ShowPic(15, 40, 16, 0, LEFT);
        Refresh();
        Delay(50);
        ShowPic(17, 40, 41, 0, LEFT);
        Refresh();
        Delay(50);
        ShackScr();
        sum_bit16(damage_address, rnd(10), 240);
        return FULL_TEST;
    }
    else if (n == 4)
    {
        // 魔法四 炼狱真炎
        p = 3; //图片号码
        s = 10; //步长
        for (j = 60; j >= 40; j = j - 20)
        {
            for (i = 1; i <= 360; i = i + s)
            {
                ShowPic(p, j *Cos(i) / 1024+75, (j / 2) *Sin(i) / 1024+35, 0, LEFT);
                Refresh();
                Delay(10);
            }
            s = s + 10;
            p = p + 2;
        }
        ShackScr();
        sum_bit16(damage_address, rnd(10), 380);
        return FULL_TEST;
    }
    else if (n == 5)
    {
        //魔法五 七绝剑气
        ArtLine_1(5, 10);
        ArtLine_1(5, 4);
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        ShackScr();
        sum_bit16(damage_address, rnd(10), 500);
        return NO_TEST;
    }
    else if (n == 6)
    {
        //魔法六 风伯见日
        for (i = 1; i <= 20; i++)
        {
            ShowPic(27, rnd(130) + 10, rnd(55) + 10, 3, LEFT);
            Refresh();
            Delay(50);
        }
        GetBlock(1, 0, 160, 80, 0, tScr);
        for (j = 0; j < 2; j++)
        {
            for (i = 0; i < 3; i++)
            {
                WriteBlock(0, 0, 160, 80, 1, tScr);
                ShowPic(19+i * 2, 40, 0, 0, LEFT);
                Refresh();
                Delay(50);
            }
        }
        sum_bit16(damage_address, rnd(10), 620);
        return HALF_TEST;
    }
    else if (n == 7)
    {
        //魔法七 雷动九天
        for (i = 0; i < 4; i++)
        {
            ShowPic(28, 40 *i + 1, 0, 0, LEFT);
            ShackScr();
            Delay(50);
        }
        //Block(50+12,0,0+48,80,0);
        ShowPic(25, 80, 40, 0, MIDDLE);
        ShackScr();
        for (i = 0; i <= 90; i = i + 10)
        {
            Circle(80, i, 15, 0, 1);
            Delay(50);
        }
        for (i = 0; i <= 60; i = i + 10)
        {
            Circle(80, i, 15, 0, 1);
        }
        for (i = 17; i <= 40; i = i + 2)
        {
            Circle(80, 60, i, 0, 1);
        }
        for (i = 1; i <= 60; i = i + 2)
        {
            Circle(80, 60, i, 0, 0);
        }
        for (j = 0; j < 3; j++)
        {
            ShowPic(86+j * 2, 80, 60, 0x40, MIDDLE);
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        ShackScr();
        sum_bit16(damage_address, rnd(10), 800);
        return NO_TEST;
    }
    else if (n == 8)
    {
        //魔法八 拨云弄日
        ShowPic(31, 40, 30, 0x43, MIDDLE);
        ArtLine_2(40, 30, 80, 40);

        ShowPic(30, 45, 60, 0x43, MIDDLE);
        ArtLine_2(45, 60, 80, 40);

        ShowPic(30, 135, 60, 0x43, MIDDLE);
        ArtLine_2(135, 60, 80, 40);

        ShowPic(31, 135, 30, 0x43, MIDDLE);
        ArtLine_2(135, 30, 80, 40);

        for (j = 0; j < 3; j++)
        {
            ShowPic(86+j * 2, 80, 40, 0x40, MIDDLE);
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        ShackScr();
        sum_bit16(damage_address, rnd(10), 700);
        return HALF_TEST;
    }
    else if (n == 9)
    {
        //魔法九 剑傲神州
        ShowPic(2, 68, 3, 3, LEFT);
        Refresh();
        for (p = 1; p >= 0; p--)
        {
            for (j = 20; j <= 60; j = j + 20)
            {
                for (i = 360; i >= 1; i = i - 10)
                {
                    rx = 30 * Cos(i) / 1024+80;
                    ry = 15 * Sin(i) / 1024+j;
                    Line(rx - 3, ry, rx + 3, ry, p);
                    Line(rx, ry - 5, rx, ry + 12, p);
                }
            }
            Delay(20);
        }
        ShowPic(32, 44, 3, 3, LEFT);
        Refresh();
        Box(1, 0, 160, 80, 1, 2);
        for (p = 1; p <= 2; p++)
        {
            for (i = 20; i <= 100; i = i + 5)
            {
                Ellipse(80, 70, i, i / 5, 0, 2);
                Ellipse(80, 70, i - 20, (i - 20) / 5, 0, 2);
            }
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        sum_bit16(damage_address, rnd(10), 900);
        return HALF_TEST;
    }
    else if (n == 10)
    {
        //魔法十 密雨狂剑
        for (i = 1; i <= 10; i++)
        {
            rx = rnd(120) + 20;
            ry = rnd(30) + 40;
            for (j = 1; j <= ry; j++)
            {
                Point(rx, j, 1);
                if (j >= 15)
                {
                    Point(rx, j - 15, 0);
                }
            }
            for (j = 8; j <= 12; j++)
            {
                Ellipse(rx, ry, j, j / 2, 0, 1);
                Ellipse(rx, ry, j - 1, (j - 1) / 2, 0, 0);
                Delay(10);
            }
            Delay(10);
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        for (i = 0; i < 20; i++)
        {
            ShowPic(70, rnd(20) + 10, rnd(79), 0, LEFT);
            Refresh();
            ShowPic(72, rnd(20) + 115, rnd(79), 0, LEFT);
            Refresh();
        }
        ShackScr();
        for (p = 1; p <= 2; p++)
        {
            for (i = 25; i <= 100; i = i + 5)
            {
                Circle(80, 60, i, 0, 2);
                Circle(80, 60, i - 25, 0, 2);
            }
        }
        sum_bit16(damage_address, rnd(10), 2400);
        return FULL_TEST;
    }
    else if (n == 11)
    {
        // 魔法十一 万剑归宗
        for (i = 1; i <= 15; i++)
        {
            //动画显示三把剑
            ShowPic(7, i *7+10, rnd(20) + 5, 0, LEFT);
            Refresh();
            Delay(10);
        }
        for (i = 1; i <= 14; i++)
        {
            ShowPic(9, 88-i * 7, rnd(20) + 48, 0, LEFT);
            Refresh();
            Delay(10);
        }
        for (i = 0; i < 10; i++)
        {
            ShowPic(11, 80, 27+i * 3, 0, MIDDLE);
            Refresh();
            Delay(10);
        }
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        for (i = 0; i < 4; i++)
        {
            //动画显示万剑归宗
            rx = 40+i * 20;
            ry = 32;
            AnimateCircle(rx + 8, ry + 8, 8, SLOW, 0);
            ShowPic(62+i, rx, ry, 0x43, LEFT);
            Delay(80);
        }
        for (i = 0; i < 5; i++)
        {
            for (j = 0; j < 3; j++)
            {
                ShowPic(86+j * 2, 10+rnd(130), 10+rnd(46), 0, MIDDLE);
                Refresh();
                Delay(20);
            }
            ShackScr();
        }
        Box(1, 0, 160, 79, 1, 2);
        GetBlock(1, 0, 160, 80, 0x40, tScr);
        WriteBlock(0, 0, 160, 80, 1, tScr);
        sum_bit16(damage_address, rnd(10), 3800);
        return HALF_TEST;
    }
    else if (n == 12)
    {
        // 魔法十二 恶蛟的必杀
        for (i = 0; i < 2; i++)
        {
            ShowPic(28, 20+i * 60, 0, 0, LEFT);
            ShackScr();
            Delay(50);
            for (k = 0; k < 4; k++)
            {
                rx = 10+rnd(130);
                ry = 10+rnd(46);
                for (j = 0; j < 3; j++)
                {
                    ShowPic(86+j * 2, rx, ry, 0, MIDDLE);
                    Refresh();
                    Delay(20);
                }
                ShackScr();
            }
        }
        sum_bit16(damage_address, rnd(10), 850);
        return HALF_TEST;
    }
    return NO_TEST;
}

//模拟战斗
long battle(char n)
{
    char tScr[1600];
    char tItem[128];
    char tMon[43];
    char IfMenuDraw;
    char IfEscape;
    char IfAlive;
    char IfShowHpMp;
    int pID_b;
    char menuID;
    char Magic_Test;
    char Pass_Test;
    long Damage;
    char Damage_Fix; //攻击修正
    char Attack_Type; //攻击种类
    char rate[2]; //各种几率
    char EqFix[6]; //装备修正
    long Item_offset;
    long Item_b;
    long Item_e;
    char Item_Use;
    addr sBattle_Enemy;
    addr sBattle_Actor;
    long i, j, k;
    IsJump = TRUE;
    if (n == 0)
    {
        return FALSE;
    }
    Inkey();
    CanShowHpMp = FALSE;
    //
    //怪物号码从1开始
    AnimateBlock(0, 0, 160, 80, FAST, 0);
    //////////////////////////////////初始属性拷贝
    fseek(fp, oMonDat + (n - 1) * (long)MonLen, 0);
    fread(tMon, 1, MonLen, fp); //载入42字节怪物数据
    //七项项怪物属性
    memcpy(mem + sBattle_mon, tMon + mon_info, mon_info_l);
    mem[sBattle_mon + b_Level] = tMon[mon_level];
    //拷贝英雄属性,首先清零
    mem[sBattle_hero + b_Level] = mem[Level];
    memset(EqFix, 0, 6);
    for (i = 0; i < 4; i++)
    {
        EqSet(EqFix, i);
    }
    for (i = 0; i < 5; i++)
    {
        sum_bit16(mem + sBattle_hero + i * 2, mem[pInfo + i], EqFix[i + 1]);
    }
    //拷贝怪物的HP,MP最大值
    memcpy(mem + sBattle_mon + b_mHp, mem + sBattle_mon + b_Hp, 4);
    //拷贝英雄HP,MP以及最大值
    memcpy(mem + sBattle_hero + b_Hp, mem + Hp, 4);
    memcpy(mem + sBattle_hero + b_mHp, mem + mHp, 4);
    //怪物名称显示修正
    for (i = 0; i < mon_name_l; i++)
    {
        if (tMon[mon_name + i] == 32)
        {
            tMon[mon_name + i] = 0;
        }
    }
    fstr(tMon + mon_name, 10, MIDDLE, 32);
    memcpy(mem + sBattle_mon + b_NAME, tMon + mon_name, b_NAME);
    memcpy(mem + sBattle_hero + b_NAME + 2, mem + HeroName, 6);
    mem[sBattle_hero + b_NAME + b_NAME_l] = 0;
    mem[sBattle_mon + b_NAME + b_NAME_l] = 0;
    //////////////////////////////////模拟战斗
    //行动顺序由敏捷决定
    if (rnd(100) < 40 && addr16(mem + sBattle_hero + b_SPD) < addr16(mem + sBattle_mon + b_SPD))
    {
        sBattle_Enemy = sBattle_mon + mem;
    }
    else
    {
        sBattle_Enemy = sBattle_hero + mem;
    }
    IfEscape = FALSE;
    do
    {
        if (addr16(sBattle_Enemy + b_Hp) == 0)
        {
            break;
        }
        //为零就死亡了
        memcpy(mem + Hp, mem + sBattle_hero + b_Hp, 4);
        memcpy(mem + mHp, mem + sBattle_hero + b_mHp, 4);
        InfoFix(); //保证HPMP不超限
        if (sBattle_Enemy == sBattle_hero + mem)
        {
            //我方行动
            Damage_Fix = 0;
            sBattle_Enemy = sBattle_mon + mem;
            sBattle_Actor = sBattle_hero + mem;
            ClearScreen();
            ShowMon(tMon[mon_num], tMon[mon_x1], tMon[mon_y1], 1, LEFT);
            /*if (IfShowHeroInfo == TRUE)
            {
                ShowPic(141, 1, 1, 1, LEFT);
                ShowPic(142, 9, 1, 1, LEFT);
                i = 0;
                if (sum_bit16(rate, addr16(sBattle_Actor + b_mHp),  -addr16(sBattle_Actor + b_Hp)) == TRUE)
                {
                    i = addr16(rate);
                }
                if (i != 0)
                {
                    Block(3, 5, 5, 4+i * 50 / addr16(sBattle_Actor + b_mHp), 0);
                }
                //
                i = 0;
                if (sum_bit16(rate, addr16(sBattle_Actor + b_mMp),  -addr16(sBattle_Actor + b_Mp)) == TRUE)
                {
                    i = addr16(rate);
                }
                if (i != 0)
                {
                    Block(11, 5, 13, 4+i * 50 / addr16(sBattle_Actor + b_mMp), 0);
                }
            }*/
            pID++;
            pID_b = pID;
            IDstack[pID] = 18; //18号战斗菜单
            menuID = IDstack[pID];
            do
            {
                wx = 6;
                wy = 13;
                IfMenuDraw = TRUE;
                if (menuID == 18)
                {
                    //战斗菜单
                    pID = pID_b + 1;
                    IDstack[pID] = 18; //18号战斗菜单
                    menuID = IDstack[pID];
                    ShowPic(115, 1, 62, 1, LEFT);
                    menuTxt(menuID);
                }
                else if (menuID == 19)
                {
                    //攻击
                    //Block(0,5*wy,160,80,0);
                    ShowPic(115, 1, 62, 1, LEFT);
                    menuTxt(menuID);
                    Attack_Type = 0;
                }
                else if (menuID == 20)
                {
                    //魔法选项
                    i = sMagic_b - 1;
                    k = 1;
                    do
                    {
                        Attack_Type = 0; //每次开始都==0
                        for (j = 0; j <= (sMagic_e - sMagic_b) + 1; j++)
                        {
                            i = i + k;
                            if (i > sMagic_e)
                            {
                                i = sMagic_b;
                            }
                            if (i < sMagic_b)
                            {
                                i = sMagic_e;
                            }
                            if (mem[i] != 0)
                            {
                                break;
                            }
                        }
                        if (mem[i] == 0)
                        {
                            break;
                        }
                        //一个魔法也没有
                        //获取魔法号码
                        Attack_Type = i - sMagic_b;
                        fseek(fp, oMagicDat + Attack_Type * (long)ItemLen, 0);
                        fread(tItem, 1, 128, fp);
                        //Block(0,5*wy,160,80,0);
                        ShowPic(115, 1, 62, 1, LEFT);
                        //MP消耗
                        k = tItem[magic_mp] * (long)256 +tItem[magic_mp + 1];
                        str(k);
                        MsgPaint(12, 5, " 耗费:", 1);
                        MsgPaint(18, 5, str_num, 1);
                        //显示名称
                        tItem[item_name + item_name_l] = 0;
                        MsgPaint(2, 5, tItem + item_name, 1);
                        Attack_Type++;
                        Refresh();
                        Key = KeyPause(200);
                        if (Key == KEY_LEFT)
                        {
                            k =  - 1;
                        }
                        else if (Key == KEY_RIGHT)
                        {
                            k = 1;
                        }
                        else if (Key == KEY_ENTER || Key == KEY_F1)
                        {
                            if (add_bit16(mem + Mp,  -k) == TRUE)
                            {
                                break;
                            }
                            MsgPaint(9, 5, "法力不足", 0x48);
                            WaitKey();
                            k = 0;
                        }
                        else if (Key == KEY_ESC || Key == KEY_F2)
                        {
                            Attack_Type = 0;
                        }
                    } while (Attack_Type != 0);
                    if (Attack_Type == 0)
                    {
                        IfMenuDraw = FALSE; //返回上级菜单
                    }
                    else
                    {
                        break; //选到魔法退出
                    }
                }
                else if (menuID == 21)
                {
                    //道具
                    ShowPic(115, 1, 62, 1, LEFT);
                    menuTxt(menuID);
                }
                else if (menuID == 22)
                {
                    //逃跑选项
                    if (mem[sWinLose] != 255)
                    {
                        Attack_Type = 254;
                        break;
                    }
                    else
                    {
                        MsgPaint(8, 5, "不能逃跑...", 0x48);
                        WaitKey();
                        IfMenuDraw = FALSE;
                    }
                }
                else if (menuID == 23)
                {
                    //状态选项
                    ShowPic(115, 1, 62, 0x41, LEFT);
                    MsgPaint(4, 5, "HP:      MP:", 0x41);
                    str(addr16(mem + Hp));
                    fstr(str_num, 6, MIDDLE, 32);
                    MsgPaint(7, 5, str_num, 0x41);
                    str(addr16(mem + Mp));
                    fstr(str_num, 6, MIDDLE, 32);
                    MsgPaint(16, 5, str_num, 0x41);
                    WaitKey();
                    IfMenuDraw = FALSE;
                }
                else if (menuID == 24)
                {
                    //普通攻击
                    break;
                }
                else if (menuID == 25)
                {
                    //附魔攻击
                    if (add_bit16(mem + Mp,  -20) == TRUE)
                    {
                        Damage_Fix = 30;
                    }
                    //测试用
                    //Attack_Type=200;
                    break;
                }
                else if (menuID >= 100)
                {
                    //道具选择
                    Attack_Type = 255;
                    menuID = menuID - 100;
                    if (menuID == 0)
                    {
                        //选择普通
                        Item_b = sItemA_b;
                        Item_e = sItemA_e;
                        Item_offset = oItemA;
                    }
                    else if (menuID == 1)
                    {
                        //选择法宝
                        Item_b = sItemD_b;
                        Item_e = sItemD_e;
                        Item_offset = oItemD;
                    }
                    i = Item_b - 1;
                    k = 1;
                    do
                    {
                        Item_Use = 0; //每次开始都==0
                        for (j = 0; j <= (Item_e - Item_b) + 1; j++)
                        {
                            i = i + k;
                            if (i > Item_e)
                            {
                                i = Item_b;
                            }
                            if (i < Item_b)
                            {
                                i = Item_e;
                            }
                            if (mem[i] != 0)
                            {
                                break;
                            }
                        }
                        if (mem[i] == 0)
                        {
                            break;
                        }
                        //一个道具也没有

                        //获取道具号码
                        Item_Use = i - Item_b;
                        fseek(fp, Item_offset + Item_Use * (long)ItemLen, 0);
                        fread(tItem, 1, 128, fp);
                        ShowPic(115, 1, 62, 1, LEFT);
                        //剩余量
                        k = mem[Item_b + Item_Use];
                        str(k);
                        MsgPaint(12, 5, " 剩余:", 1);
                        MsgPaint(18, 5, str_num, 1);
                        //拷贝事件量
                        memcpy(mem + mEventDat, tItem + item_edat, item_edat_l);
                        //显示道具名称,偷懒的方法,直接在最后补零了。
                        tItem[item_name + item_name_l] = 0;
                        MsgPaint(2, 5, tItem + item_name, 1);
                        Item_Use++;
                        Refresh();
                        Key = KeyPause(200);
                        if (Key == KEY_LEFT)
                        {
                            k =  - 1;
                        }
                        else if (Key == KEY_RIGHT)
                        {
                            k = 1;
                        }
                        else if (Key == KEY_ENTER || Key == KEY_F1)
                        {
                            //是否可以在战斗中使用
                            if (Test(tItem[item_sign_use], 2) > 0)
                            {
                                mem[Item_b + Item_Use - 1]--;
                                break;
                            }
                            else
                            {
                                MsgPaint(5, 5, "不能在战斗中使用", 0x48);
                                WaitKey();
                                k = 0;
                            }
                        }
                        else if (Key == KEY_ESC || Key == KEY_F2)
                        {
                            Item_Use = 0;
                        }
                    } while (Item_Use != 0);
                    if (Item_Use == 0)
                    {
                        IfMenuDraw = FALSE; //返回上级菜单
                    }
                    else
                    {
                        break; //选到道具退出
                    }
                }
                if (IfMenuDraw == TRUE)
                {
                    menudraw(menuID);
                }
                else
                {
                    pID--;
                }
                menuID = IDstack[pID];
            } while (pID >= pID_b);
            //战斗菜单循环结束
            //MsgPaint(8,0,tMon+mon_name,0x48);
            ClearScreen();
            ShowMon(tMon[mon_num], tMon[mon_x1], tMon[mon_y1], 1, LEFT);
            Refresh();
        }
        else if (sBattle_Enemy == sBattle_mon + mem)
        {
            //怪物行动
            Damage_Fix = 0;
            sBattle_Enemy = sBattle_hero + mem;
            sBattle_Actor = sBattle_mon + mem;
            ClearScreen();
            ShowPic(HERO_BODY_PIC, 80, 40, 1, MIDDLE);
            Refresh();
            sum_bit16(rate, 0, 0); //将逃跑率设为0
            if (addr16(sBattle_Actor + b_Hp) *10 / addr16(sBattle_Actor + b_mHp) < 2)
            {
                //HP小于1/5
                rate[0] = 10;
            }
            if (rnd(100) < addr16(rate))
            {
                //选择逃跑
                Attack_Type = 254;
            }
            else
            {
                //选择某种攻击方式
                Attack_Type = tMon[mon_action + rnd(6)];
            }
        }
        else
        {
        	exit(0);
        	// 出错
        }
        for (i = pID_b; i <= pID; i++)
        {
            ENstack[i] = FALSE;
        }
        pID = pID_b - 1; //清空菜单的栈
        /////////////////////////////////////////////////////////
        //徒手战斗
        /*if(Attack_Type==200)
        {//测试用
        Damage=10000;
        }else*/
        if (Attack_Type == 0)
        {
            //动画是从100开始的
            //Miss鉴定  60%+40%(Agl2-Agl1)/Agl1
            if (sum_bit16(rate, addr16(sBattle_Actor + b_SPD),  -addr16(sBattle_Enemy + b_SPD)) == FALSE)
            {
                sum_bit16(rate, 0, 0);
            }
            if (rnd(100) < 40 * addr16(rate) / addr16(sBattle_Enemy + b_SPD) + 60)
            {
                //普通攻击 (Atk*2-Def)*3+附加伤害
                if (sum_bit16(rate, addr16(sBattle_Actor + b_ATK) *2,  - addr16(sBattle_Enemy + b_DEF)) == FALSE)
                {
                    sum_bit16(rate, 0, 0);
                }
                i = rnd(2) + 1;
                Damage = addr16(rate) * 3 + (rnd(10) + i * 5);
                //会心一击鉴定 10%+40%(LUC)/100+攻击修正
                if (rnd(100) < addr16(sBattle_Actor + b_LUC) *40 / 100+10+Damage_Fix)
                {
                    Damage = Damage * 3 / 2;
                    i = 3;
                }
                //攻击动画
                Magic(100+i, rate, sBattle_Enemy, tScr);
            }
            else
            {
                //攻击失误!!
                Damage = 0;
                GetBlock(1, 0, 160, 80, 0, tScr);
                for (i = 10; i < 72; i = i + 5)
                {
                    ShowPic(123, 1+i, 40, 0, LEFT);
                    Refresh();
                    WriteBlock(0, 0, 160, 80, 1, tScr);
                    Delay(10);
                }
                WriteBlock(0, 0, 160, 80, 1, tScr);
                Refresh();
                Delay(10);
            }
        }
        else if (Attack_Type == 255)
        {
            if (Item_b != sItemD_b)
            {
                //使用普通道具
                Translate();
                MsgPaint(5, 5, mem + HeroName, 0x41);
                MsgPaint(11, 5, "使用了道具", 0x41);
                Damage = 0;
                Delay(300);
            }
            else
            {
                //使用法宝
                GetBlock(1, 0, 160, 80, 0, tScr);
                Magic(ItemD_Attack[Item_Use - 1], rate, sBattle_Enemy, tScr);
                Damage = addr16(rate);
            }
        }
        else if (Attack_Type == 254)
        {
            Damage = 0;
            IfEscape = TRUE;
            GetBlock(1, 0, 160, 80, 0, tScr);
            for (i = 0; i < 2; i++)
            {
                //逃跑字幕动画
                ShowPic(125, 48+3, 40, 0, LEFT);
                Refresh();
                WriteBlock(0, 0, 160, 80, 1, tScr);
                Delay(100);
                ShowPic(125, 48-3, 40, 0, LEFT);
                Refresh();
                WriteBlock(0, 0, 160, 80, 1, tScr);
                Delay(100);
            }
            ShowPic(125, 48, 40, 0, LEFT);
            Refresh();
            Delay(100);
            //逃跑鉴定25%+75%(Agl1-Agl2)/Agl2
            if (sum_bit16(rate, addr16(sBattle_Actor + b_SPD),  -addr16(sBattle_Enemy + b_SPD)) == FALSE)
            {
                sum_bit16(rate, 0, 0);
            }
            if (rnd(100) > 75 * addr16(rate) / addr16(sBattle_Enemy + b_SPD) + 25)
            {
                IfEscape = FALSE;
                for (i = 1; i <= 4; i++)
                {
                    //没成功字幕动画
                    ShowPic(127, 90, 20+10 * i, 0, MIDDLE);
                    Refresh();
                    WriteBlock(0, 0, 160, 80, 1, tScr);
                    Delay(100);
                }
                Delay(100);
            }
        }
        else
        {
            //魔法攻击
            //REM 鉴定公式 30%+30%(INT2-INT1)/INT1
            GetBlock(1, 0, 160, 80, 0, tScr);
            Magic_Test = Magic(Attack_Type, rate, sBattle_Enemy, tScr);
            Damage = addr16(rate);
            if (Damage != 0)
            {
                Damage = Damage + (*((addr)sBattle_Actor + b_Level)) * 5 / 2;
            }
            if (Magic_Test != NO_TEST)
            {
                Pass_Test = FALSE;
                if (sum_bit16(rate, addr16(sBattle_Enemy + b_INT),  -addr16(sBattle_Actor + b_INT)) == FALSE)
                {
                    sum_bit16(rate, 0, 0);
                }
                if (addr16(rate) > addr16(sBattle_Actor + b_INT))
                {
                    sum_bit16(rate, 0, addr16(sBattle_Actor + b_INT));
                }
                if (rnd(100) < 30 *addr16(rate) / addr16(sBattle_Actor + b_INT) + 30)
                {
                    Pass_Test = TRUE;
                }
                if (Pass_Test == TRUE && Magic_Test == FULL_TEST)
                {
                    Damage = 1;
                    ShowPic(136, 40, 65, 0x40, LEFT);
                }
                if (Pass_Test == TRUE && Magic_Test == HALF_TEST)
                {
                    Damage = Damage / 2;
                    ShowPic(138, 40, 65, 0x40, LEFT);
                }
            }
            Delay(200);
        }
        //得到伤害值然后显示
        if (Damage != 0)
        {
            str(Damage);
            j = (160-(strlen(str_num) + 3) *8) / 2;
            ShowPic(58, j, 65, 0, LEFT);
            j = j + 8;
            ShowPic(47, j, 65, 1, LEFT);
            j = j + 8;
            for (i = 0; i < strlen(str_num); i++)
            {
                ShowPic(str_num[i], j, 65, 1, LEFT);
                j = j + 8;
            }
            ShowPic(60, j, 65, 0, LEFT);
        }
        /////////////////////////////////////////////////////////
        memcpy(mem + sBattle_hero + b_Hp, mem + Hp, 4);
        memcpy(mem + sBattle_hero + b_mHp, mem + mHp, 4);
        /*if (sBattle_Enemy == sBattle_hero + mem)
        {
            IfAlive = TRUE;//debug: 无敌
        }
        else*/
        {
            IfAlive = add_bit16(sBattle_Enemy + b_Hp, -Damage);
        }
        if (IfAlive == FALSE)
        {
            *(sBattle_Enemy + b_Hp) = 0;
            *(sBattle_Enemy + b_Hp + 1) = 0;
        }
        //
        if (sBattle_Enemy == sBattle_hero + mem)
        {
            j = 1;
            IfShowHpMp = TRUE;
        }
        else
        {
            j = 145;
            IfShowHpMp = CanShowHpMp;
        }
        if (IfShowHpMp)
        {
            ShowPic(141, j, 1, 1, LEFT);
            ShowPic(142, j+8, 1, 1, LEFT);
            i = 0;
            if (sum_bit16(rate, addr16(sBattle_Enemy + b_mHp),  -addr16(sBattle_Enemy + b_Hp)) == TRUE)
            {
                i = addr16(rate);
            }
            if (i != 0)
            {
                Block(j+2, 5, j+4, 4+i * 50 / addr16(sBattle_Enemy + b_mHp), 0);
            }
            //
            i = 0;
            if (sum_bit16(rate, addr16(sBattle_Enemy + b_mMp),  -addr16(sBattle_Enemy + b_Mp)) == TRUE)
            {
                i = addr16(rate);
            }
            if (i != 0)
            {
                Block(j+10, 5, j+12, 4+i * 50 / addr16(sBattle_Enemy + b_mMp), 0);
            }
        }
        Refresh();
        if (IfEscape)
        {
            break;
        }
        Delay(800);//debug:从等待换成延时
        //WaitKey();
    } while (IfAlive == TRUE);
    //////////////////////////////////战斗结束胜负处理
    IsJump = TRUE;
    if (IfEscape == TRUE)
    {
        return WIN;
    }
    if (sBattle_Enemy == sBattle_hero + mem)
    {
        return LOSE;
    }
    ClearScreen();
    ShowSysTxt(0, 65, 6, 1, +0);
    //循环显示n项奖励
    for (i = 0; i < mon_aword_l; i++)
    {
        str(tMon[mon_aword + i]);
        MsgPaint(16, i + 1, str_num, 1);
    }
    //奖励写回
    if (addr16(mem + Level) < 100)
    {
        add_bit16(mem + Money, tMon[mon_aword_G]);
        add_bit16(mem + Exp, tMon[mon_aword_E]);
        add_bit16(mem + mHp, tMon[mon_aword_H]);
        add_bit16(mem + mMp, tMon[mon_aword_M]);
    }
    //道具奖励
    if (rnd(100) < AWORD_RATE)
    {
        fseek(fp, oItemA + (tMon[mon_item] - 1) * (long)ItemLen + item_name, 0);
        fread(tMon + mon_name, 1, mon_name_l, fp);
        MsgPaint(16, 5, tMon + mon_name, 1);
        add_bit8(mem + sItemA_b + tMon[mon_item] - 1, 1);
    }
    //绘制花纹
    ShowPic(140, 1, 0, 3, LEFT);
    Refresh();
    WaitKey();
    while (addr16(mem + Exp) >= addr16(mem + mExp) && mem[Level] < MAX_LEVEL)
    {
        //升级
        //ClearScreen();
        for (i = 0; i < 3; i++)
        {
            ShowPic(140, 1, 0, 1, LEFT);
            ShowPic(131-i, 30+i * 5, 26, 3, LEFT);
            ShowPic(134-i, 130-i * 5, 52, 3, RIGHT);
            Refresh();
            Delay(50);
        }
        tMsgPaint(56, 55, "级别", 0x43);
        str(mem[Level]);
        fstr(str_num, 3, MIDDLE, 32);
        tMsgPaint(86, 55, str_num, 0x43);
        Delay(500);
        AnimateCircle(91, 60, 8, SLOW, 0);
        str(mem[Level] + 1);
        fstr(str_num, 3, MIDDLE, 32);
        tMsgPaint(86, 55, str_num, 0x43);
        Delay(800);
        ShowPic(140, 1, 0, 1, LEFT);
        ShowPic(135, 68, 40, 1, MIDDLE);
        Refresh();
        for (i = 0; i < 5; i++)
        {
            j = mem[pInfo_add + i] * (mem[Level] + 1) / 100 - mem[pInfo_add + i] * mem[Level] / 100;
            str(mem[pInfo + i]);
            fstr(str_num, 3, MIDDLE, 32);
            tMsgPaint(10 *6, i *13+9, str_num, 3);
            add_bit8(mem + pInfo + i, j); //属性增加
            str(mem[pInfo + i]);
            fstr(str_num, 3, MIDDLE, 32);
            tMsgPaint(15 *6, i *13+9, str_num, 3);
        }
        mem[Level]++; //级别增加1
        sum_bit16(mem + mExp, mem[Level] * mem[Level] * (long)655 / 100, 0);
        Refresh();
        sum_bit16(mem + Hp, 0, addr16(mem + mHp));
        sum_bit16(mem + Mp, 0, addr16(mem + mMp));
        Delay(1500);
    }
    Refresh();
    IsJump = TRUE;
    return WIN;
    //////////////////////////////////战斗结束胜负处理
}

//战斗测试
long Test_Battle()
{
    char i, j;
    if (Key != KEY_LEFT && Key != KEY_RIGHT && Key != KEY_UP && Key != KEY_DOWN)
    {
        return FALSE;
    }
    if (mem[sBattle] == 0)
    {
        return FALSE;
    }
    mem[Step]++;
    if (rnd(100) > 50 && mem[Step] > mem[sBattle])
    {
        j = 0;
        for (i = 0; i < 3; i++)
        {
            j = j + mem[nMonster + i];
        }
        if (j == 0)
        {
            return FALSE;
        }
        //没有怪物号码
        j = 0;
        do
        {
            j = mem[nMonster + rnd(3)];
        } while (j == 0);
        mem[Step] = 0;
        return j; //返回怪物号码
    }
    return FALSE;
}

//模拟菜单
void menu(char id)
{
    char menuID;
    int pID_b;
    int i, j, k;
    addr ptr;
    int x, y, p;
    char eName[17]; //装备名字
    char EqFix[6]; //装备数值修正
    char tEqFix[6]; //装备数值修正对比
    char tEqInfo[3]; //源装备信息临时储存
    char tScr[128]; //临时存屏幕，或者存道具的介绍
    char txt[wx_max *3+1]; //储存3行
    char EquPerFix[4][6][6]; //
    char EquName[40][12];
    char IfMenuDraw; //表示是否画菜单
    char IfEquMake; //表示是否在打造
    char bLoop; //是否循环
    int Item_b; //道具起始号码
    int Item_e; //道具终止号码
    long Item_offset; //道具信息偏移
    int Equ_Kind; //装备类型手身脚配（打造用变量）
    int Equ_No; //装备号码

    memcpy(EquPerFix, mem + mEquPerFix, 144);
    memcpy(EquName, mem + mEquName, 480);
    pID++; //从1开始是ID栈
    pID_b = pID;
    IDstack[pID] = id;
    menuID = id;
    eName[16] = 0;
    while (pID >= pID_b)
    {
        IfMenuDraw = TRUE;
        wx = 6;
        wy = 13;
        if (menuID == 0)
        {
            //主菜单状态，属性菜单
            ShowPic(110, 1, 0, 1, LEFT);
            WriteBlock(10, 26, 32, 32, 1, mem + mHeroHead);
            tMsgPaint(9, 62, mem + HeroName, 3);
            InfoFix();
            for (i = 0; i < 3; i++)
            {
                str(addr16(mem + Hp + i * 2)); //各种属性
                fstr(str_num, 5, RIGHT, 32);
                MsgPaint(14, i + 1, str_num, 1);
                str(addr16(mem + mHp + i * 2));
                //fstr(str_num,5,LEFT,32);
                MsgPaint(20, i + 1, str_num, 1); //属性最大值
            }
            str(mem[Level]);
            MsgPaint(19, 4, str_num, 1);
            str(addr16(mem + Money));
            fstr(str_num, 5, MIDDLE, 32);
            MsgPaint(18, 5, str_num, 1);
            for (i = pID_b + 1; i <= pID; i++)
            {
                ENstack[i] = FALSE;
            }
            pID = pID_b;
            menuID = 0;
        }
        else if (menuID == 1)
        {
            //选项菜单
            ShowPic(111, 1, 0, 1, LEFT);
            MsgPaint(6, 2, "菜单记忆 是  否", 1);
            MsgPaint(6, 3, "点移像素 1 2 4 8", 1);
            MsgPaint(6, 4, "跑步按键  ", 1);
            if (IsMenuMemary == TRUE)
            {
                MsgPaint(15, 2, "是", 9);
            }
            else
            {
                MsgPaint(19, 2, "否", 9);
            }
            //
            str(MovePixel0);
            i = 0;
            if (MovePixel0 >= 2)
            {
                i = (MovePixel0 / 3) * 2 + 2;
            }
            MsgPaint(15 + i, 3, str_num, 9);
            //
            str(SpeedUpKey);
            fstr(str_num, 3, MIDDLE, 32);
            MsgPaint(17, 4, str_num, 1);
        }
        else if (menuID == 2)
        {
            //状态菜单
            ShowPic(112, 1, 0, 1, LEFT);
            memset(EqFix, 0, 6); //清除装备修正缓存
            for (i = 0; i < 4; i++)
            {
                if (mem[sEqu + i] != 0)
                {
                    memcpy(eName, EquPerFix[i][mem[sEqu + i] - 1], 6);
                    memcpy(eName + 6, EquName[mem[nEqu + i] - 1] + 2, 10); //获得装备名字
                    tMsgPaint(3 *wx + 1, (i + 1) *wy, eName, 3); //打印装备
                    EqSet(EqFix, i); //加上装备修正,修正之后EqFix[1~5]就是装备属性加权
                }
            }
            for (i = 0; i < 5; i++)
            {
                str(mem[pInfo + i] + EqFix[i + 1]);
                MsgPaint(23, i + 1, str_num, 1);
            }
        }
        else if (menuID == 3)
        {
            //物品菜单
            ShowPic(111, 1, 0, 1, LEFT);
            menuTxt(menuID);
        }
        else if (menuID == 5)
        {
            //系统菜单
            //ClearScreen();
            ShowPic(111, 1, 0, 1, LEFT);
            //ShowSysTxt(0,menu_title,1,3);
            MsgPaint(7, 5, GAME_VER, 3); //打印版本号
            menuTxt(menuID);
        }
        else if (menuID == 6 || menuID == 7 || menuID == 8 || menuID == 9)
        {
            //四个装备
            IfMenuDraw = FALSE;
            Refresh();
            Key = KEY_F1;
            Equ_Kind = menuID - 6;
            if (mem[sEqu + Equ_Kind] != 0)
            {
                //写下方文字
                ShowPic(119, 1, 61, 0x41, LEFT);
                GetBlock(112, 5 *wy, 48, 13, 0x40, tScr);
                ShowSysTxt(5, menuID + 72, 1, 0x41, +0);
                WriteBlock(112, 5 *wy, 48, 13, 0x41, tScr);
                ShowPic(119, 1, 61, 0x43, LEFT);
                for (i = 0; i < 3; i++)
                {
                    str(mem[fEqu + i + Equ_Kind * 3]);
                    MsgPaint(4+i * 6, 5, str_num, 0x43);
                }
                AnimateBox(EquX - 4, EquY - 4, 40, 40, SLOW, 0);
                ShowPic(120, EquX - 4, EquY - 4, 0x41, LEFT);
                ShowEqu(EquName[mem[nEqu + Equ_Kind] - 1][1], EquX, EquY, 0x43);
                Key = WaitKey();
                Refresh();
            }
            if (Key == KEY_F4)
            {
                //卸下装备
                if (mem[nEquBox + Equ_Kind] >= EquBox_max)
                {
                    MsgPaint(8, 2, "箱子满了...", 0x48);
                    Delay(500);
                    MsgPaint(8, 2, "丢弃吗(Y/N)", 0x48);
                    Key = WaitKey();
                    if (Key == KEY_Y || Key == KEY_F1)
                    {
                        mem[sEqu + Equ_Kind] = 0;
                    }
                    Key = KEY_F4;
                }
                else
                {
                    j = mEquBox + Equ_Kind * EquBox_max * EquBox_len + mem[nEquBox + Equ_Kind] *EquBox_len;
                    mem[j] = mem[nEqu + Equ_Kind];
                    mem[j + 1] = mem[sEqu + Equ_Kind];
                    memcpy(mem + j + 2, mem + fEqu + Equ_Kind * 3, 3);
                    mem[nEquBox + Equ_Kind]++;
                    mem[sEqu + Equ_Kind] = 0;
                    mem[nEqu + Equ_Kind] = 0;
                    memset(mem + fEqu + Equ_Kind * 3, 0, 3);
                }
            }
            else if (mem[nEquBox + Equ_Kind] != 0 && Key == KEY_F1)
            {
                //防制卸载完就要求装备
                MsgPaint(8, 2, " 更换装备 ", 0x48);
                //装备bug自动修正
                if (mem[nEquBox + Equ_Kind] > EquBox_max)
                {
                    mem[nEquBox + Equ_Kind] = EquBox_max;
                    i = mEquBox + Equ_Kind * EquBox_max * EquBox_len;
                    for (j = 0; j < EquBox_max; j++)
                    {
                        if (mem[i + j * EquBox_len] == 255)
                        {
                            mem[nEquBox + Equ_Kind] = j;
                            break;
                        }
                    }
                }
                /////////////////
                Delay(300);
                //进入装备库
                p = 0;
                do
                {
                    ShowPic(121, 1, 0, 1, LEFT);
                    ShowSysTxt(5, 78+Equ_Kind, 1, 3, +0);
                    //        每种装备箱子的长度                现在装备信息的位置
                    i = mEquBox + Equ_Kind * EquBox_max * EquBox_len + p * EquBox_len;
                    Equ_No = mem[i] - 1;
                    k = mem[i + 1];
                    memcpy(eName, EquPerFix[Equ_Kind][k - 1], 6);
                    memcpy(eName + 6, EquName[Equ_No] + 2, 10); //获得装备名字
                    ptr = strchr(eName, 32);
                    if (ptr != NULL)
                    {
                         *ptr = 0;
                    }
                    fstr(eName, 16, MIDDLE, 32);
                    tMsgPaint(0, 4 *wy - 3, eName, 3);
                    memcpy(tEqInfo, mem + fEqu + Equ_Kind * 3, 3); //把原来装备信息储存
                    memset(tEqFix, 0, 6);
                    memset(EqFix, 0, 6); //信息清零
                    for (j = 0; j < 4; j++)
                    {
                        EqSet(EqFix, j);
                    }
                    //计算装备前的效果
                    for (j = 0; j < 3; j++)
                    {
                        mem[fEqu + Equ_Kind * 3+j] = mem[i + 2+j];
                        str(mem[i + 2+j]);
                        MsgPaint(4+j * 6, 5, str_num, 3);
                    } //储存并打印目前的信息
                    for (j = 0; j < 4; j++)
                    {
                        EqSet(tEqFix, j);
                    }
                    //计算装备后的效果
                    for (j = 0; j < 5; j++)
                    {
                        str(EqFix[j + 1] + mem[pInfo + j]);
                        fstr(str_num, 3, RIGHT, 32);
                        MsgPaint(18, j, str_num, 3);
                        str(tEqFix[j + 1] + mem[pInfo + j]);
                        MsgPaint(23, j, str_num, 3);
                    }
                    //显示装备数量
                    MsgPaint(2, 0, "/", 1);
                    str(p + 1);
                    fstr(str_num, 2, RIGHT, 32);
                    MsgPaint(0, 0, str_num, 1);
                    str(mem[nEquBox + Equ_Kind]);
                    MsgPaint(3, 0, str_num, 1);
                    Delay(200);
                    Refresh();
                    AnimateBox(32, 6, 40, 40, SLOW, 0);
                    ShowPic(120, 32, 6, 0x41, LEFT);
                    ShowEqu(EquName[Equ_No][1], 36, 10, 0x43);
                    bLoop = TRUE;
                    while (bLoop == TRUE)
                    {
                        Key = WaitKey();
                        memcpy(mem + fEqu + Equ_Kind * 3, tEqInfo, 3); //把原来装备信息还愿
                        if (Key == KEY_LEFT || Key == KEY_UP)
                        {
                            if (p != 0)
                            {
                                p--;
                                bLoop = FALSE;
                            }
                        }
                        else if (Key == KEY_RIGHT || Key == KEY_DOWN)
                        {
                            if (p < mem[nEquBox + Equ_Kind] - 1)
                            {
                                p++;
                                bLoop = FALSE;
                            }
                        }
                        else if (Key == KEY_Y || Key == KEY_F1)
                        {
                            //更换装备
                            memcpy(mem + fEqu + Equ_Kind * 3, mem + i + 2, 3);
                            bLoop = FALSE;
                            if (mem[sEqu + Equ_Kind] != 0)
                            {
                                mem[i] = mem[nEqu + Equ_Kind];
                                mem[i + 1] = mem[sEqu + Equ_Kind];
                                memcpy(mem + i + 2, tEqInfo, 3);
                            }
                            else
                            {
                                Key = KEY_F4;
                            }
                            mem[nEqu + Equ_Kind] = Equ_No + 1;
                            mem[sEqu + Equ_Kind] = k;
                        }
                        if (Key == KEY_F4)
                        {
                            //删除装备
                            bLoop = FALSE;
                            MsgPaint(6, 2, " 整理装备... ", 0x48);
                            if (mem[nEquBox + Equ_Kind] < EquBox_max)
                            {
                                memmove(mem + i, mem + i + EquBox_len, (EquBox_max - p - 1) *EquBox_len);
                            }
                            if (p + 1 == mem[nEquBox + Equ_Kind])
                            {
                                p--;
                            }
                            mem[nEquBox + Equ_Kind]--;
                            if (mem[nEquBox + Equ_Kind] == 0)
                            {
                                Key = KEY_ESC;
                            }
                        }
                        if (Key == KEY_ESC || Key == KEY_N || Key == KEY_F2)
                        {
                            Key = KEY_ESC;
                            bLoop = FALSE;
                        }
                    } //bLoop循环
                } while (Key != KEY_ESC);
            } //是否有装备可换
        }
        else if (menuID == 4 || menuID == 10 || menuID == 11 || menuID == 12)
        {
            //三种道具和法术
            //ClearScreen();
            //ShowSysTxt(0,menu_title,1,3);
            ShowPic(111, 1, 0, 1, LEFT);
            if (menuID == 4)
            {
                Item_b = sMagic_b;
                Item_e = sMagic_e;
                Item_offset = oMagicDat;
            }
            else if (menuID == 10)
            {
                Item_b = sItemA_b;
                Item_e = sItemA_e;
                Item_offset = oItemA;
            }
            else if (menuID == 11)
            {
                Item_b = sItemD_b;
                Item_e = sItemD_e;
                Item_offset = oItemD;
            }
            else if (menuID == 12)
            {
                Item_b = sItemB_b;
                Item_e = sItemB_e;
                Item_offset = oItemB;
            }
            j = 0; //计数清零
            for (i = 0; i <= Item_e - Item_b; i++)
            {
                if (mem[Item_b + i] > 0)
                {
                    mem[tItemNum + j] = i; //把号码标到上面
                    fseek(fp, Item_offset + i * (long)ItemLen, 0);
                    fread(mem + tItemPicNum + j * 2, 1, 2, fp);
                    j++; //道具数量
                }
            }
            //绘制道具初始参数
            if (j == 0)
            {
                IfMenuDraw = FALSE;
            }
            else
            {
                MenuData[menuID][menu_max] = j;
                MenuData[menuID][menu_id_next] = 100; //起始ID
                MenuData[menuID][menu_n_line] = 9;
                i = 0;
                x = 8;
                y = 16;
                wx = 8;
                wy = 16;
                while (i < j)
                {
                    DrawPic(x, y, 16, 16, oItemPic + mem[tItemPicNum + i * 2+1] *(long)32, 3);
                    x = x + wx * 2;
                    if (x >= 152)
                    {
                        x = 8;
                        y = y + wy;
                    }
                    i++;
                }
            }
        }
        else if (menuID == 13)
        {
            //神器显示（大图示的道具）
            //ClearScreen();
            Item_b = sItemC_b;
            Item_e = sItemC_e;
            Item_offset = oItemC; //获取偏移地址
            j = 0;
            for (i = 0; i <= Item_e - Item_b; i++)
            {
                if (mem[Item_b + i] > 0)
                {
                    mem[tItemNum + j] = i; //把号码标到上面
                    fseek(fp, Item_offset + i * (long)ItemLen, 0);
                    fread(mem + tItemPicNum + j * 2, 1, 2, fp);
                    j++; //神器数量
                }
            }
            if (j != 0)
            {
                //绘制神器开始
                i = 1;
                while (i != 0)
                {
                    bLoop = TRUE;
                    fseek(fp, Item_offset + mem[tItemNum + i - 1] * (long)ItemLen, 0);
                    fread(tScr, 1, 128, fp); //读取道具信息
                    ShowPic(114, 1, 0, 1, LEFT); //清除屏幕
                    memcpy(txt, tScr + item_name, item_name_l); //道具名称
                    txt[item_name_l] = 0;
                    MsgPaint(14, 1, txt, 3);
                    memcpy(txt, tScr + item_kind, item_kind_l); //道具种类
                    txt[item_kind_l] = 0;
                    MsgPaint(14, 2, txt, 3);
                    //str(mem[Item_b+(i-1)]);//道具数量
                    //MsgPaint(21,2,str_num,0x41);
                    //if(Test(tScr[item_sign_equ],2)>0) ShowSysTxt(3,83,1,0x41);//是否可以在地图使用
                    memcpy(txt, tScr + item_info, item_info_l); //道具介绍
                    txt[item_info_l] = 0;
                    tMsgPaint(3, 45, txt, 3);
                    ShowEqu(mem[tItemPicNum + (i - 1) *2+1], 25, 12, 3); //绘制神器图片
                    Refresh();
                    while (bLoop == TRUE)
                    {
                        Key = WaitKey();
                        if ((Key == KEY_Y || Key == KEY_F1) && Test(tScr[item_sign_equ], 2) > 0)
                        {
                            ShowPic(117, 46, 30, 0x41, LEFT);
                            Delay(300);
                            memcpy(mem + mEventDat, tScr + item_edat, item_edat_l);
                            Translate();
                            bLoop = FALSE;
                            Refresh();
                        }
                        else if (Key == KEY_LEFT || Key == KEY_RIGHT)
                        {
                            if (Key == KEY_LEFT)
                                i--;
                            else
                                i++;
                            bLoop = FALSE;
                            if (i == 0)
                            {
                                i = j;
                            }
                            if (i > j)
                            {
                                i = 1;
                            }
                        }
                        else if (Key == KEY_ESC || Key == KEY_F2)
                        {
                            bLoop = FALSE;
                            i = 0;
                        }
                    } //神器按键循环
                } //神器显示循环
            } //判断是不是需要绘制神器
            IfMenuDraw = FALSE;
        }
        else if (menuID == 14)
        {
            //储存进度
            suju(SAVE_GAME);
            IfMenuDraw = FALSE;
        }
        else if (menuID == 15)
        {
            //读取进度
            if (suju(LOAD_GAME) == TRUE)
            {
                break;
            }
            else
            {
                IfMenuDraw = FALSE;
            }
        }
        else if (menuID == 16)
        {
            //退出游戏
            suju(EXIT_GAME);
        }
        else if (menuID >= 100 && menuID < 200)
        {
            IfEquMake = FALSE;
            //ClearScreen();
            //ShowSysTxt(0,menu_title,1,3);
            ShowPic(114, 1, 0, 1, LEFT);
            ShowSysTxt(1, 35, 2, 3, +0); //显示框架
            i = mem[tItemNum + menuID - 100]; //获得道具号码
            fseek(fp, Item_offset + i * (long)ItemLen, 0);
            fread(tScr, 1, 128, fp); //读取道具信息
            memcpy(txt, tScr + item_name, item_name_l); //道具名称
            txt[item_name_l] = 0;
            MsgPaint(5, 1, txt, 1);
            if (Item_offset != oMagicDat)
            {
                memcpy(txt, tScr + item_kind, item_kind_l); //道具种类
                txt[item_kind_l] = 0;
                MsgPaint(5, 2, txt, 1);
                str(mem[Item_b + i]); //道具数量
                MsgPaint(21, 2, str_num, 1);
            }
            else
            {
                memcpy(txt, tScr + magic_kind, item_kind_l); //魔法种类
                txt[item_kind_l] = 0;
                MsgPaint(5, 2, txt, 1); //打印魔法种类
                str(tScr[magic_mp] * (long)256 +tScr[magic_mp + 1]);
                MsgPaint(15, 2, "法力:", 1);
                MsgPaint(20, 2, str_num, 1); //打印MP
            }
            memcpy(txt, tScr + item_info, item_info_l); //道具介绍
            txt[item_info_l] = 0;
            tMsgPaint(3, 45, txt, 3);
            //MsgPaint(0,3,txt,1);
            Refresh();
            if (Test(tScr[item_sign_equ], 2) > 0 && Test(tScr[item_sign_use], 1) > 0)
            {
                ShowPic(116, 159, 25, 0x43, RIGHT); //是否可以打造
            }
            else if (Test(tScr[item_sign_use], 1) > 0)
            {
                ShowPic(117, 159, 25, 0x43, RIGHT); //是否可以在地图使用
            }
            Key = WaitKey(); //响应按键
            while ((Key == KEY_Y || Key == KEY_F1) && Test(tScr[item_sign_use], 1) > 0 && mem[Item_b + i] > 0)
            {
                if (Test(tScr[item_sign_equ], 2) > 0)
                {
                    //是装备
                    //mem[Item_b+i]--;
                    ShowPic(119, 1, 61, 1, LEFT);
                    ShowSysTxt(5, tScr[equ_info], 1, 3, +0);
                    IfEquMake = TRUE;
                    menuID = 17;
                    break;
                }
                else
                {
                    mem[Item_b + i]--;
                    memcpy(mem + mEventDat, tScr + item_edat, item_edat_l);
                    Translate();
                    str(mem[Item_b + i]);
                    MsgPaint(21, 2, "   ", 0x41);
                    MsgPaint(21, 2, str_num, 0x41);
                    Key = WaitKey();
                }
            }
            if (IfEquMake == FALSE)
            {
                IfMenuDraw = FALSE;
            } ////////退栈，返回上级菜单
        }
        else if (menuID >= 210 && menuID < 215)
        {
            //打造装备
            mem[Item_b + i]--;
            ClearScreen();
            Refresh();
            ShowPic(122, 40, 30, 0x41, LEFT);
            ShowPic(121, 1, 0, 1, LEFT);
            i = menuID - 210; //获取打造号码
            Equ_Kind = tScr[equ_kind + i] - 1; //装备种类
            Equ_No = tScr[equ_property + i * 4] - 1;
            //ShowSysTxt(0,73,5,3);
            ShowSysTxt(5, 78+Equ_Kind, 1, 3, +0);
            k = rnd(6) + 1;
            memcpy(eName, EquPerFix[Equ_Kind][k - 1], 6);
            memcpy(eName + 6, EquName[Equ_No] + 2, 10); //获得装备名字
            ptr = strchr(eName, 32);
            if (ptr != NULL)
            {
                 *ptr = 0;
            }
            fstr(eName, 16, MIDDLE, 32);
            tMsgPaint(0, 4 *wy - 3, eName, 3);

            memcpy(tEqInfo, mem + fEqu + Equ_Kind * 3, 3); //把原来装备信息储存
            memset(tEqFix, 0, 6);
            memset(EqFix, 0, 6); //信息清零
            for (j = 0; j < 4; j++)
            {
                EqSet(EqFix, j);
            }
            //计算装备前效果
            for (j = 0; j < 3; j++)
            {
                mem[fEqu + Equ_Kind * 3+j] = tScr[equ_property + 1+j + i * 4] *k / 6;
                str(tScr[equ_property + 1+j + i * 4] *k / 6);
                MsgPaint(4+j * 6, 5, str_num, 3);
            } //储存目前的信息
            for (j = 0; j < 4; j++)
            {
                EqSet(tEqFix, j);
            }
            //计算装备后的效果
            for (j = 0; j < 5; j++)
            {
                str(EqFix[j + 1] + mem[pInfo + j]);
                fstr(str_num, 3, RIGHT, 32);
                MsgPaint(18, j, str_num, 3);
                str(tEqFix[j + 1] + mem[pInfo + j]);
                MsgPaint(23, j, str_num, 3);
            }
            Delay(200);
            Refresh();
            AnimateBox(22, 6, 40, 40, SLOW, 0);
            ShowPic(120, 22, 6, 0x41, LEFT);
            ShowEqu(EquName[Equ_No][1], 26, 10, 0x43);
            Key = WaitKey();
            if (Key != KEY_Y && Key != KEY_F1)
            {
                //不装备
                MsgPaint(8, 2, "保留吗(Y/N)", 0x48);
                Key = WaitKey();
                if (Key == KEY_N || Key == KEY_F2)
                {
                    MsgPaint(8, 2, "丢弃产物...", 0x48);
                }
                else if (mem[nEquBox + Equ_Kind] < EquBox_max)
                {
                    MsgPaint(8, 2, "放进了箱子.", 0x48);
                    //        每种装备箱子的长度                现在装备信息的位置
                    j = mEquBox + Equ_Kind * EquBox_max * EquBox_len + mem[nEquBox + Equ_Kind] *EquBox_len;
                    mem[j] = Equ_No + 1;
                    mem[j + 1] = k;
                    memcpy(mem + j + 2, mem + fEqu + Equ_Kind * 3, 3);
                    mem[nEquBox + Equ_Kind]++;
                }
                else
                {
                    MsgPaint(8, 2, "箱子满了...", 0x48);
                    Delay(500);
                    MsgPaint(8, 2, "丢弃产物...", 0x48);
                }
                memcpy(mem + fEqu + Equ_Kind * 3, tEqInfo, 3); //把原来装备信息还愿
            }
            else
            {
                MsgPaint(8, 2, "获得新装备", 0x48);
                Delay(800);
                if (mem[nEquBox + Equ_Kind] < EquBox_max)
                {
                    if (mem[sEqu + Equ_Kind] != 0)
                    {
                        MsgPaint(8, 2, "旧装备储存..", 0x48);
                        //        每种装备箱子的长度                现在装备信息的位置
                        j = mEquBox + Equ_Kind * EquBox_max * EquBox_len + mem[nEquBox + Equ_Kind] *EquBox_len;
                        mem[j] = mem[nEqu + Equ_Kind];
                        mem[j + 1] = mem[sEqu + Equ_Kind];
                        memcpy(mem + j + 2, tEqInfo, 3);
                        mem[nEquBox + Equ_Kind]++;
                    }
                }
                else
                {
                    MsgPaint(8, 2, "箱子满了...", 0x48);
                    Delay(500);
                    MsgPaint(8, 2, "丢弃旧装备.", 0x48);
                }
                mem[nEqu + Equ_Kind] = Equ_No + 1;
                mem[sEqu + Equ_Kind] = k;
            }
            IfMenuDraw = FALSE;
            IfEquMake = FALSE;
        }
        else if (menuID >= 215 && menuID < 220)
        {
            IfMenuDraw = FALSE;
            i = menuID - 215;
            if (i == 0)
            {
                if (IsMenuMemary == TRUE)
                {
                    IsMenuMemary = FALSE;
                }
                else
                {
                    IsMenuMemary = TRUE;
                }
            }
            else if (i == 1)
            {
                MovePixel0 = MovePixel0 * 2;
                if (MovePixel0 > 8)
                {
                    MovePixel0 = 1;
                }
                MovePixel = MovePixel0;
            }
            else if (i == 2)
            {
                MsgPaint(8, 2, "请按字母键..", 0x48);
                do
                {
                    j = WaitKey();
                } while(j < 'a' || j > 'z');
                SpeedUpKey = j;
            }
        }
        //选择性的绘制菜单
        if (IfMenuDraw == TRUE)
        {
            menudraw(menuID);
        }
        else
        {
            pID--;
        }
        menuID = IDstack[pID];
    } //菜单循环结束
    //恢复菜单栈
    for (i = pID_b; i <= pID; i++)
    {
        ENstack[i] = FALSE;
    }
    pID = pID_b - 1;
    Key = 0;
    IsJump = TRUE;
    DrawMap();
}

//事件读取程序
void RunEvent(char eNo)
{
    long offset; //事件偏移量
    char add[2]; //事件地址
    offset = oEvent + (mem[MapNo] - 1) * (long)2048;
    fseek(fp, offset + eNo, 0);
    fread(add, 1, 1, fp);
    fseek(fp, offset + eNo + 256, 0);
    fread(add + 1, 1, 1, fp);
    fseek(fp, offset + addr16(add), 0);
    fread(mem + mEventDat, 1, 256, fp);

    Translate();
    //坐标恢复
    if (IfLink != TRUE && IsEnter != TRUE)
    {
        DrawMap();
    }
    IsEnter = FALSE;
    if (mem[nBattleMon] != FALSE)
    {
        //事件战斗
        mem[sWinLose] = 255; //判断是不是可以逃跑
        mem[sWinLose] = battle(mem[nBattleMon]);
        DrawMap();
        mem[nBattleMon] = FALSE;
        IfMove = FALSE;
    }
    if (IfMove == TRUE)
    {
        mem[nBattleMon] = Test_Battle();
    }
    //判断战斗
    IfMove = FALSE;
}

//主循环
void main()
{
    int bRun;
    int bGame;
    int i;
    char CanChangeMode;
    CanChangeMode = FALSE;

    srand(Getms());
    GameInitialize(); //游戏初始化文件
    do
    {
        bGame = suju(GAME_START);
        if (bGame == FALSE)
        {
            suju(END_GAME);
        }
        //BUG修正
        for (i = 0; i < 3; i++)
        {
            poke(4898+i, 0);
        }
        //poke(4919,1);//飞天御云珠
        //正式开始
        mem[nBattleMon] = FALSE;
        IsJump = TRUE;
        bRun = TRUE;
        getmap(mem[MapNo]);
        RunEvent(map(mem[tpx], mem[tpy])); //开始的时候需要触发事件
        //游戏循环
        while (bRun == TRUE)
        {
            //Key = KeyPause(0);
            Key = CheckKey(128);
            if (Key == 0)
            {
                if (DoDrawPlayer)
                {
                    DrawMap();
                }
                Key = getchar();
            }
            Key = ConvertKey(Key);
            //地图循环
            if (Key >= KEY_UP && Key <= KEY_LEFT)
            {
                if (Key - 20 != mem[PlayerFix] / 2)
                {
                    mem[PlayerFix] = (Key - 20) *2;
                    DoDrawPlayer = TRUE;
                    DrawMap();
                    Key = 0;
                }
                else
                {
                    //判断图像转换问题
                    if (mem[PlayerFix] == (Key - 20) *2+Player)
                    {
                        mem[PlayerFix] = (Key - 20) *2+1+Player;
                    }
                    else
                    {
                        mem[PlayerFix] = (Key - 20) *2+Player;
                    }
                } //判断是否只是转向
            } //是否为方向按键
            /*if (Key==KEY_CAPS)
            {//测试
                if(mem[Level]<255) mem[Level]++;
                //属性增加
                for(i=0;i<5;i++) add_bit8(mem+pInfo+i,mem[pInfo_add+i]*(mem[Level]+1)/100-mem[pInfo_add+i]*mem[Level]/100);
                add_bit16(mem+mHp,10);
                add_bit16(mem+mMp,10);
                Delay(100);
            }*/
            if (Key == KEY_ENTER || Key == KEY_F1)
            {
                if (DoDrawMap == TRUE)
                {
                    IsJump = TRUE;
                    DrawMap();
                    WaitKey();
                }
                else
                {
                    Key = mem[PlayerFix] / 2+20;
                    IsEnter = TRUE;
                }
            }
            if (Key == KEY_HELP || Key == 'h')
            {
                menu(0);
            }
            if (Key == KEY_UP)
            {
                if (mem[tpy] > 0)
                {
                    mem[tpy]--;
                    RunEvent(map(mem[tpx], mem[tpy]));
                }
            }
            if (Key == KEY_DOWN)
            {
                if (mem[MapY] < MapH - ScrH || mem[tpy] < ScrH)
                {
                    mem[tpy]++;
                    RunEvent(map(mem[tpx], mem[tpy]));
                }
            }
            if (Key == KEY_LEFT)
            {
                if (mem[tpx] > 0)
                {
                    mem[tpx]--;
                    RunEvent(map(mem[tpx], mem[tpy]));
                }
            }
            if (Key == KEY_RIGHT)
            {
                if (mem[MapX] < MapW - ScrW || mem[tpx] < ScrW)
                {
                    mem[tpx]++;
                    RunEvent(map(mem[tpx], mem[tpy]));
                }
            }
            if (CheckKey(KEY_PAGEUP) == 0)
            {
                CanChangeMode = TRUE;
            }
            else if (CanChangeMode)
            {
                CanChangeMode = FALSE;
                if (MovePixel == 8)
                {
                    MovePixel = MovePixel0;
                }
                else
                {
                    MovePixel = 8;
                }
            }
            while (IfLink == TRUE)
            {
                IfLink = FALSE;
                Key = mem[PlayerFix] / 2+20;
                RunEvent(map(mem[px], mem[py]));
            }
            if (mem[nBattleMon] != FALSE)
            {
                //普通遇敌
                if (battle(mem[nBattleMon]) == LOSE)
                {
                    if (mem[4926-memfix] != 0)
                    {
                        ClearScreen();
                        MsgPaint(0, 2, " 使用凤凰羽毛么？  (Y/N) ", 8);
                        Refresh();
                        Key = WaitKey();
                        if (Key == KEY_N || Key == KEY_F2)
                        {
                            bRun = suju(GAME_OVER);
                        }
                        else
                        {
                            poke(4926, 0);
                            DrawMap();
                            mem[nBattleMon] = FALSE;
                        }
                    }
                    else
                    {
                        bRun = suju(GAME_OVER);
                    }
                }
                else
                {
                    //没有凤凰羽毛
                    DrawMap();
                    mem[nBattleMon] = FALSE;
                } //判断有没有凤凰羽毛
            } //遇敌判断结束
        } //bRun游戏循环结束
    } while (bGame == TRUE);
    //bGame循环结束
    return ;
}
