//----------------------------------------------------------------
//#include <stdio.h>
//#include <system.h>
//----------------------------------------------------------------
#define OBJ_BLANK		0
#define OBJ_TREE		1
#define OBJ_BRICK		2
#define OBJ_GRAY		3
#define OBJ_MAN			4
#define OBJ_MAN2		5  
#define OBJ_GLOBALVIEW1	6
#define OBJ_GLOBALVIEW2	7
#define OBJ_GLOBALVIEW3	8
#define OBJ_GLOBALVIEW4	9
#define OBJ_GLOBALVIEW5	10
#define OBJ_GLOBALVIEW6	11
#define OBJ_GLOBALVIEW7	12
#define OBJ_GLOBALVIEW8	13
#define OBJ_DR			14
#define OBJ_DRHOUSE1	15
#define OBJ_DRHOUSE2	16
#define OBJ_DRHOUSE3	17
#define OBJ_DRHOUSE4	18
#define OBJ_DRHOUSE5	19
#define OBJ_DRHOUSE6	20
#define OBJ_SLEEP		21
#define OBJ_OFFICE1   	22
#define OBJ_OFFICE2   	23
#define OBJ_SMILE		24
#define OBJ_OFFICE3   	25
#define OBJ_OFFICE4   	26
#define OBJ_OFFICE5   	27
#define OBJ_OFFICE6   	28
#define OBJ_CHEMICAL	29
#define OBJ_RICHHOUSE1  30
#define OBJ_RICHHOUSE2	31
#define OBJ_RICHHOUSE3	32
#define OBJ_RICHHOUSE4	33
#define OBJ_RICHHOUSE5	34
#define OBJ_RICHHOUSE6	35
#define OBJ_RICHHOUSE7	36
#define OBJ_RICHHOUSE8	37
#define OBJ_RICHHOUSE9	38
#define OBJ_RAPID1		40
#define OBJ_RAPID2		41
#define OBJ_RAPID3		42
#define OBJ_RAPID4		43
#define OBJ_RAPID5		44
#define OBJ_RAPID6		45
#define OBJ_DOORCLOSE	46
#define OBJ_DOOROPEN	47
#define OBJ_STAIR1		48
#define OBJ_STAIR2		49
#define OBJ_FLOWER		50
#define OBJ_HOME1		51
#define OBJ_HOME2		52
#define OBJ_HOME3		53
#define OBJ_HOME4		54
#define OBJ_TABLE		55
#define OBJ_CABINET		56
#define OBJ_GIRL		57
#define OBJ_BED			58
#define OBJ_POLICE		59
#define OBJ_SLINGSHOT	60
#define OBJ_TICKETMACHINE	61
#define OBJ_MONEY		62
#define OBJ_TICKET		63
#define OBJ_CELLPHONE	64
#define OBJ_STREETLAMP	65
#define OBJ_INVOICE		66
#define OBJ_COMPUTER	67
#define OBJ_CC800		68
#define OBJ_WATER		69
#define OBJ_CABINET_OPEN	70
#define OBJ_BADMANL		71
#define OBJ_BADMANR		72
#define OBJ_RAPIDCAR1	73
#define OBJ_RAPIDCAR2	74
#define OBJ_RAPIDCAR3	75
#define OBJ_TRACK		76
#define OBJ_CLOSESTOOL	77
#define OBJ_TOILETPAPER	78
#define OBJ_SAD			79
#define OBJ_ASSISTANT	80
//----------------------------------------------------------------
#define LCD_HEIGHT_START	0
#define LCD_HEIGHT_END		3
#define LCD_WIDTH_START		0
#define LCD_WIDTH_END		9

#define LCD_MAX_WIDTH_OBJ		10
#define LCD_MAX_HEIGHT_OBJ		4
//----------------------------------------------------------------
#define  LEFT_ARROW	  23
#define  RIGHT_ARROW  22
#define  UP_ARROW     20
#define  DOWN_ARROW   21
#define  KEY_ENTER		13
#define  KEY_ESC		27
#define  KEY_HELP		25
//----------------------------------------------------------------
#define DELAY_TIME		200
//----------------------------------------------------------------
#define TALK		0
#define SEARCH		1
#define USE			2
//----------------------------------------------------------------
#define MAP_MAX_WIDTH_OBJ		31
#define MAP_MAX_HEIGHT_OBJ		30
//----------------------------------------------------------------
#define LCD_MAX_WIDTH_DOT		160
#define LCD_MAX_HEIGHT_DOT		80
#define LCD_MAX_WIDTH_BYTE		20
//----------------------------------------------------------------
#define OBJECT_WIDTH_DOT	16
#define OBJECT_WIDTH_BYTE	2
#define OBJECT_HEIGHT_DOT	20
#define Y_OFFSET			400			//20*20	LCD_WIDTH_BYTE*OBJECT_HEIGHT_DOT
#define OBJECT_DATA_SIZE	40			//2*20 OBJECT_WIDTH_BYTE*OBJECT_HEIGHT_DOT
//----------------------------------------------------------------
char MapData[][MAP_MAX_WIDTH_OBJ]={

//0             x05            x10            x15            x20
01,01,01,01,01,30,31,32,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,
01,15,16,17,01,33,34,35,01,01, 0, 0,51,52,01, 0, 0, 0, 0, 0,01,40,41,42,01, 0,01, 0, 0, 0,01,
01,14,19,20,65,36,37,38, 0,01, 0, 0,53,54,01, 0, 0, 0, 0, 0,01,43,44,45,65, 0,01,01,01, 0,01,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01, 0, 0, 0, 0, 0,01, 0,01, 0,01,
01,01,65, 0,01,01,01,01,65,01,01,01,01,01, 0,01,01,65,01,01,01, 0, 0,01, 0, 0,01, 0,01, 0,01,
01,01, 0, 0, 0,01,01,01,40,41,42,01, 0, 0, 0,01,01,22,23,01,01, 0, 0,01, 0,01, 0, 0, 0, 0,01,
01, 0,01,01, 0, 0,01,01,43,44,45,01, 0, 0, 0,01,25,26,27,28,01,01, 0, 0, 0, 0, 0, 0, 0,01,01,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,01, 0, 0, 6, 7, 8, 9, 0, 0,01,
01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01, 0,10,11,12,13,65, 0,01,
01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01,01, 0, 0, 0, 0, 0, 0, 0,01,
  
//10            x05            x10            x15            x20
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,01,01,01,01,01,01,01,01,01,01,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
03,03,03,03,03,03,03,03,03,03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
76,02,02,02,03,02,02,61,02,02, 0,03,03,03,03,03,03,03,03,03,03, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
73, 0, 0, 0,46, 0, 0, 0, 0,48, 0,03,02,02,02,02,02,02,56,02,03, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
74, 0, 0, 0,03, 0, 0, 0, 0,03, 0,03,50, 0, 0, 0,55, 0, 0,58,03, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
75, 0, 0, 0,46, 0, 0, 0,50,03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,03, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,
76,03,03,03,03,03,03,03,03,03, 0,03,03,03,03,03,03,03,03,03,03, 0, 0, 0, 0, 0, 0, 0, 0, 0,01,

//20            x05            x10            x15            x20            x25
03,56,02,02,02,02,02,02,02,03, 0,03,02,02,02,02,02,03,02,56,03,03,03,03,03,03,03,03,03,03,03,
03, 0, 0, 0, 0, 0, 0, 0, 0,03, 0,03, 0, 0, 0, 0, 0,47, 0, 0,03,03,02,02,03,02,56,03,02,02,03,
03, 0, 0,03, 0, 0,03,80, 0,03, 0,03, 0, 0, 0, 0, 0,03, 0, 0,03,03, 0, 0,03,77, 0,03, 0, 0,03,
03,55,67,03, 0, 0,03, 0,67,03, 0,03, 0,03, 0, 0, 0,03,58, 0,47,03, 0, 0,46, 0, 0,47, 0, 0,03,
03,03,03,03, 0, 0,03,03,03,03, 0,03, 0,03,03,03,03,03,03,03,03,03, 0, 0,03,03,03,03, 0, 0,03,
03,02,02,02, 0, 0,02,02,02,03, 0,03,56,02,03,02,02,02,02,02,03,03, 0, 0,02,03,02,02, 0, 0,03,
03,50, 0, 0, 0, 0, 0, 0, 0,03, 0,49, 0, 0,46, 0, 0, 0, 0, 0,03,03, 0, 0, 0,03, 0, 0, 0, 0,03,
03,03,03,03,03, 0,03,03,03,03, 0,03, 0, 0,03, 0, 0, 0, 0, 0, 0,03, 0, 0,72,46, 0, 0, 0, 0,46,
02,02,02,02,02, 0,02,02,02,02, 0,03, 0,57,55, 0, 0, 0, 0, 0,03,03, 0, 0, 0,03, 0, 0, 0,14,03,
01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03,03

//30
};

int GraphicData[][20]={

//Blank
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,

//Tree
0x0000,0x0000,0xF81F,0xFC1E,0x5475,0xBFBA,0x55D5,0xEFEE,0x55D5,0xAB6A,0x5555,0xEF6E,0x5675,0xBA1A,0xD61F,0xFC01,0xE001,0xA001,0xA001,0xE001,

//Brick
0xBB3B,0x1F1F,0x0E0E,0x1C1C,0x3838,0x7070,0xE0E0,0xF1F1,0xBBBB,0x1F1F,0x0E0E,0x1C1C,0x3838,0x7070,0xE0E0,0xF1F1,0xBBBB,0x1F1F,0x0E0E,0x1C1C,

//Gray
0x8888,0x4444,0x2222,0x1111,0x8888,0x4444,0x2222,0x1111,0x8888,0x4444,0x2222,0x1111,0x8888,0x4444,0x2222,0x1111,0x8888,0x4444,0x2222,0x1111,

//Man
0xFC3F,0xFE7F,0xFEFF,0xFF7F,0xB669,0x05A0,0x0660,0x0420,0x8819,0x3004,0xCC3B,0x0A50,0x0A50,0x0A50,0xFA6F,0xF61F,0x7038,0x7038,0x701C,0x783C,
0xFC3F,0xFE7F,0xFEFF,0xFF7F,0xB669,0x05A0,0x0660,0x0420,0x8819,0x3004,0xCC3B,0x0A50,0x0A50,0x0A50,0xF65F,0xF83F,0x1C0E,0x1C0E,0x380E,0x3C1E,

//Global View
0x0000,0x0802,0x7F01,0x8800,0x7F01,0x3E04,0x221A,0x3E27,0x1941,0x2E41,0x4921,0x8822,0x7F24,0x0010,0x0710,0x0710,0x0708,0x0708,0x030C,0x0304,
0x0000,0x1008,0xF80F,0x1008,0xF18F,0x1678,0xF00F,0x1008,0xF00F,0x4002,0x440A,0x440C,0x7FB8,0x0000,0x203C,0x10C4,0x1004,0x1004,0x1F04,0xF087,
0x0000,0x0208,0x0208,0x4208,0xCFFF,0x0208,0x1708,0x0A0C,0x0A12,0x0221,0x8241,0x42FF,0xF2C1,0x0741,0x0441,0x0441,0x0842,0x0842,0xC8FF,0x3C42,
0x0000,0x0010,0x007E,0x0053,0xC0FF,0xF052,0x3852,0x187E,0x0810,0x08FF,0x0824,0x1818,0xD8E6,0x7098,0x3098,0x3098,0x3098,0x2098,0x60B8,0xE0BF,
0x0304,0x0306,0x0302,0x0102,0x0103,0x0101,0x0101,0x8100,0x8000,0x8000,0x4000,0x4000,0x2000,0x2000,0x2000,0x3000,0x1000,0x1000,0x1800,0x0F00,
0x109C,0x10C4,0x10C4,0x10C2,0x10C2,0x7FC2,0x80C7,0x00FC,0xE0E1,0x00F8,0x1FE0,0x20E0,0x27E0,0x2470,0x2570,0x2570,0x1570,0x1538,0x1538,0xFFFF,
0x0B42,0x0942,0x0942,0x0942,0x1142,0x11FE,0xF101,0x0F00,0xC203,0x3200,0x02FF,0x0201,0x02F9,0x0205,0x02F5,0x06F5,0x04F5,0x05F2,0x05F2,0xFDFF,
0xE031,0xE030,0x4030,0x4030,0xC030,0xC07C,0x807F,0x807F,0x807F,0x807F,0x807F,0x00FF,0x00FF,0x00FF,0x00FF,0x00FE,0x00FE,0x00FE,0x00FE,0x00FC,

//DR.
0xF01F,0xDC3F,0xF673,0x825F,0x3340,0x198C,0x0D98,0x11B4,0x41C0,0xE347,0xB266,0xFA6F,0x3A2E,0x2E3C,0x3F7E,0x4553,0xC551,0xC771,0xCE33,0xFF7F,

//Dr. House(3x2)
0x3F00,0x3A00,0x2800,0x4600,0x5200,0xA900,0xA400,0xA301,0x4101,0x0001,0x0002,0xC004,0xBF04,0x0D09,0x150A,0x1732,0x0042,0x1F8C,0x0088,0xFFFF,
0xFCFF,0x2222,0x0100,0x8A8A,0x0000,0x22A2,0x0040,0xAA2A,0x00B0,0x22CA,0x0066,0x8A31,0x8008,0x6204,0x3002,0x8E81,0xC300,0x2000,0x1300,0xFEFF,
0x0000,0x0000,0x0000,0x00C0,0x0060,0x0030,0x0008,0x00AE,0x8001,0x4022,0x2000,0x988A,0x0E00,0x2322,0x7F00,0x83BF,0x1CE0,0xE401,0x08FE,0x0800,
0x0008,0xFF07,0x0004,0x0004,0x0004,0x0004,0x0002,0x3F03,0x2001,0xA700,0xAB00,0x8B00,0x8B00,0x8B00,0x8900,0x8500,0xE500,0x1F00,0x0000,0x0000,
0x1000,0xE0FF,0x2000,0x2000,0x2300,0x2200,0x2300,0x21E0,0x2138,0x21C4,0x21E8,0x40E8,0x40E8,0x43E8,0x40E8,0x40E8,0x40E8,0x40E8,0x4F7E,0xF001,
0x0800,0x0800,0x1800,0x1000,0x10FE,0x1002,0x20F4,0x2034,0x2074,0x4074,0x40FA,0x4002,0x403E,0x80C0,0x8000,0x8000,0x8003,0x003C,0x00E0,0x0000,

//Sleep
0xFDBF,0xFFFF,0xFFFF,0xFFFF,0xB7E9,0x05A0,0x07E0,0x05A0,0x8999,0x3184,0xFFFF,0x0180,0xFDBF,0xABEA,0x45C4,0xABAA,0x15D1,0xABAA,0xFDFF,0x03C0,

//Office (4x2)
0x0000,0xFF00,0xC401,0xEA02,0x3F04,0x3E0A,0x1410,0xAA1A,0x0520,0x2362,0x2182,0xE8AB,0x2082,0x22A2,0xE082,0x2AAA,0xE083,0x22A2,0x0080,0xA8A8,
0x0000,0x00F0,0x0078,0x00FC,0x0012,0x00AB,0x8044,0xC0AA,0xE017,0xF0FF,0x0880,0xFCFF,0x58D5,0xA8AA,0xD8D7,0xE8AB,0x58D5,0xA8AA,0x58D5,0xA8AA,

//Smile
0x0000,0x0000,0xE003,0x180C,0x0410,0x0220,0x0220,0x2142,0x0140,0x0140,0x0140,0x0948,0x0948,0x1224,0xE223,0x0410,0x180C,0xE003,0x0000,0x0000,

0x0000,0x0700,0x3800,0xF700,0x2203,0x2202,0x7202,0xD302,0x5602,0x5202,0x5202,0xF402,0x0802,0x0002,0x0002,0xA802,0x0002,0x2202,0xFF01,0x0000,
0x0080,0x22A2,0x0000,0x40E0,0xFD4F,0x2549,0x2042,0xBC4C,0x80E0,0xE047,0x2041,0x2442,0x3D4C,0xE003,0xD005,0xC8A9,0xC809,0xCA29,0xC899,0xFFFF,
0x5CD5,0xFFFF,0x4464,0x2A08,0xBFFF,0xBF00,0x04FF,0x2A22,0x31FF,0x2F08,0x35FF,0x2A08,0xB5FF,0x2A00,0x3500,0xAAA8,0x3500,0x2A22,0x3500,0xFFFF,
0x0000,0x00F8,0x0044,0x00AB,0x80D1,0xE0FE,0x50FC,0xECAF,0xF317,0xFCFF,0x587D,0xA8AE,0x5865,0xA8BE,0x5855,0xA8AA,0x5855,0xA8AA,0xF87F,0x00C0,

//Chemical
0x0000,0x0000,0x0000,0xE007,0x2004,0x6004,0x4002,0x4002,0x4002,0x4004,0x2008,0x1010,0xF81D,0xF81D,0xF81F,0xF01F,0xF00F,0xE007,0x8003,0x0000,

//Rich House(3x3)
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0xFF00,0x223F,0x0040,0xAA6F,
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0100,0x0F00,0x0F00,0x0F00,0x1F00,0x1F00,0x1F00,0x1F00,0x1F00,0x3F00,0x3FC0,0xFF3F,0x7F00,0xAFAA,
0x0000,0x0000,0x0000,0x0000,0x0000,0xE01F,0xD8FF,0xACFF,0xD4FF,0xA8FF,0x58FF,0xA8FF,0x58FF,0xB0FF,0x50FF,0xB0FE,0x60FF,0xA0FE,0x60FD,0xA0FE,
0x0060,0x227E,0x8023,0x8A3A,0x0020,0x223A,0x0030,0xAA3A,0x0010,0x2212,0xFC10,0x0F1F,0x0C11,0x0C11,0x0C11,0x8C08,0x8808,0x8808,0xFF0F,0x0078,
0x0000,0x2222,0x0000,0x8A8A,0x0100,0x2322,0x0100,0xABAA,0x0100,0x2322,0x0300,0x8BFA,0x0337,0xFF20,0x8720,0x8720,0x8720,0x0721,0x07A1,0x0FFF,
0x40FD,0xC0FE,0x70FD,0xCCFA,0x42FD,0xE2FA,0x82FD,0xAAFA,0x84F5,0xA4FA,0x84F5,0x8CEB,0x0CF5,0x22EB,0x01F5,0xABEA,0x01D6,0xA3EB,0x71D6,0x4BEE,
0x0080,0x0080,0xFF9F,0xFFFF,0xFFFF,0xFF3F,0xC011,0x0011,0x0011,0x7F11,0x4011,0x7F11,0x4411,0x4412,0x4412,0x4412,0x4412,0x4412,0xFF7F,0x0000,
0xFF03,0x0F00,0x0FC0,0x3FFE,0xCFFF,0xCFFF,0xCF18,0xBF08,0x8F08,0x8FE8,0x0F29,0x0FE9,0x0F69,0x1F69,0x1F49,0x1F4A,0x1F4A,0xFE4F,0xFFFF,0xFF01,
0x4FD4,0x89AC,0x91D4,0x91AC,0x93D8,0xFFBF,0xFF7F,0x01C0,0x3D40,0x81DD,0x7943,0x01C0,0x3D47,0x01C0,0xFF7F,0x38BA,0x3852,0x30B2,0x30FA,0xF0FB,

//Error (39)(0x27)
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,

//Rapid(3x2)
0x0000,0x0100,0x0300,0x3F00,0x7F00,0xFF00,0x0100,0x0000,0x1F00,0xF800,0x9001,0x1701,0x3801,0x1701,0x9801,0xB700,0x9200,0x9200,0x9500,0x7801,
0x00FC,0x00C0,0x00BF,0x80FF,0xFFE3,0xFEC7,0xFDFF,0xC0FD,0x8003,0x003F,0xFE84,0xBAF2,0x10A4,0x7CF2,0x54A0,0x7CE6,0x5482,0xFEF2,0x1185,0xFFF4,
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0x00E0,0x0030,0x003C,0x003E,0x007F,0xC07F,0xE07F,0xF07F,0xF0FF,0xE0FF,0xE0FF,0xE0FF,0xC0FF,0xC0FF,
0xC002,0x7F02,0x530A,0x3214,0x1214,0x1214,0x1224,0x1224,0x1224,0x1244,0x1244,0x1222,0x9221,0x5F02,0x701E,0x5F08,0x4008,0x7F08,0x400C,0xFF01,
0xF13C,0x9FE7,0x90E4,0x9024,0x9E27,0x9EE7,0x9EE7,0x9EE7,0x9EE7,0x9CE7,0x9CE7,0x9CE7,0x9CE7,0xFFFF,0x0000,0x0BFF,0x0A00,0x0AFC,0x0A00,0xFFFF,
0xC0FF,0x80FF,0x803C,0x4038,0x3838,0x2470,0x2470,0x2470,0x2460,0x2460,0x2440,0x2480,0x4480,0x44C0,0x4440,0xC460,0xFC10,0xA00E,0xE00B,0xE0FD,

//Door Close
0xFFFF,0xEAAB,0x7555,0x6AAB,0x7555,0x6AAB,0x7555,0x6AAB,0x7555,0x6AAB,0x7555,0x6AAB,0x7555,0x7FFF,0x6001,0x6001,0x6001,0x6001,0x6001,0xE001,

//Door Open
0xFFFF,0xEAAB,0xD556,0x6AAD,0x555A,0x6ABC,0x5568,0x6AA8,0x5568,0x6AA8,0x5568,0x6AA8,0x5568,0x7FE8,0x8028,0x0029,0x002A,0x003C,0x0000,0x0000,

//Stair1
0x0000,0x0000,0x0000,0xFF01,0x8001,0x4001,0x2001,0x1F0F,0x950C,0x5A0A,0x3509,0xFA78,0xD564,0xAA52,0xD549,0xAA47,0x5545,0xAA26,0x5515,0xAA0E,

//Stair2
0x0000,0x0000,0x0000,0x80FF,0x8001,0x8002,0x8004,0xF0F8,0x30A9,0x505A,0x90AC,0x1E5F,0x26AB,0x4A55,0x92AB,0xE255,0xA2AA,0x6455,0xA8AA,0x7055,

//Flower
0x6000,0xF000,0x9000,0x9030,0xB038,0xE02C,0xC025,0x0013,0x000B,0xE00F,0x5837,0xAC6B,0x5C77,0xE44F,0x1C70,0xE82F,0x0820,0x1010,0x1010,0xE00F,

//Home (2x2)
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0xFF00,0x4401,0xAA03,0x9102,0xEA05,0x4405,0xEA0A,0x3116,0xBA14,0x343E,0xBA58,0x39FA,0x8EF8,0x264A,
0x0000,0x0000,0x0000,0x0000,0x0000,0x0000,0xC0FF,0x4044,0xA0AA,0x2011,0xB0AA,0x5044,0xA8AA,0x1811,0xACAA,0x4444,0xAAAA,0x1211,0xABAA,0x4544,
0x8F08,0x230A,0x8808,0x220A,0x8808,0xE20B,0x3809,0x120B,0x1809,0x120B,0x1805,0x1207,0x1805,0x1207,0x1805,0x1207,0x1801,0xF200,0x1C00,0x0300,
0xFEAA,0xD6FF,0xBAAA,0x76DD,0xDAB6,0x56D5,0xFAB6,0x56DD,0xAAAA,0x56D5,0xAAAA,0x56D5,0xAAAA,0x56D5,0xABAA,0x55D5,0xABEA,0x7F55,0xC0EF,0x00F8,

//Table
0x0000,0x0000,0x0000,0x0000,0xFFFF,0xABAA,0x55D5,0xABAA,0x55D5,0xABAA,0x55D5,0xFFFF,0x0180,0xFFFF,0x2A54,0x3A5C,0x0A50,0x0A50,0x0A50,0x0E70,

//Cabinet
0xFFFF,0x06A0,0x0560,0x06A0,0x0560,0xFEBF,0x0560,0xF6AF,0x1568,0x96A9,0x1568,0xF6AF,0x0560,0xF7EF,0x1428,0x9429,0x1428,0xF42F,0x0420,0xFC3F,

//Girl
0xFC0F,0xFE1B,0xFE39,0x7F30,0x1F20,0x1F40,0x2744,0x0120,0x0220,0x2222,0xC551,0x1F6E,0xF1C7,0x180C,0x1414,0x1414,0x1414,0x1C1C,0xF007,0x380F,

//Bed
0xFBDF,0x05A0,0x05A0,0x05A0,0x05A0,0xF99F,0xFDBF,0x03C0,0x0180,0xFDBF,0x47C4,0xABAA,0x1191,0xABAA,0x45C4,0xABAA,0x1191,0xABAA,0xFDFF,0x03C0,

//Police
0xE00F,0x1870,0x0480,0x1480,0xCE9F,0x0AC0,0xFB7F,0x0180,0x0280,0x02C0,0x8463,0x0820,0xF01F,0x8C22,0x0341,0x6D8D,0x0BB1,0xF8DF,0xF81F,0x7C3F,

//Slingshot
0x0000,0x0000,0x3060,0x4890,0x7CF8,0x7CFC,0x6CBC,0x4E96,0x6AB3,0xCB91,0xE9A8,0xE98F,0x7162,0xBB28,0x4E12,0xC018,0x4012,0xC018,0xC01A,0x800F,

//Ticket Machine
0xFFFF,0x06A0,0x0560,0x06A0,0x0560,0xFEBF,0xFD7F,0x0EB0,0xCD76,0x0EB0,0x6D75,0x0EB0,0xED77,0xFFFF,0x0C31,0xFC3F,0x9C3B,0xFC3F,0x0C31,0xFC3F,

//Money
0x0000,0x0000,0x0C00,0x1E00,0x3700,0x7B00,0xDD00,0xA203,0x610F,0xA23A,0x57F7,0xEE7B,0x7835,0xB01B,0xE00D,0xC007,0x8003,0x0000,0x0000,0x0000,

//Ticket
0x0000,0xF83F,0xB82A,0xB82A,0xF82B,0xF82B,0x382A,0x382A,0x382A,0x382A,0x382A,0x382A,0x382A,0x382B,0xB82C,0xB822,0xB822,0xB822,0xF83F,0x0000,

//Cellphone
0x0000,0x0018,0x0018,0x0018,0x803F,0x6020,0x902F,0x5030,0x3030,0x3030,0x3030,0xD02F,0x1020,0x502D,0x1020,0x502D,0x1020,0x502D,0x6018,0xC00F,

//Streetlamp
0x0001,0x8003,0x4005,0xE00F,0x4004,0x4004,0x8003,0x0001,0x0001,0x0001,0x0001,0x0001,0x0001,0x0001,0x0001,0x0001,0x0001,0x8003,0xC007,0xE00F,

//Invoice
0x0000,0x0000,0x0000,0x0000,0xE07F,0x3040,0x2840,0x3C5E,0x0440,0xC44B,0x0440,0xD45D,0x0440,0xE447,0x0458,0x0440,0x7440,0x0440,0xFC7F,0x0000,

//Computer
0xFC1F,0x0C18,0x1414,0xE413,0x27F2,0x27B2,0xF5D3,0xFFBF,0x31C6,0x1BAC,0xEDDB,0xFFFF,0x0180,0xFFFF,0x2A54,0x3A5C,0x0A50,0x0A50,0x0A50,0x0E70,

//CC800
0x000C,0x000F,0xC00B,0xF008,0x3C0B,0xCF0A,0x330A,0x0D09,0xC516,0xB527,0xED38,0x3942,0x8F90,0x25C4,0x0FF1,0x5E3C,0x3C0F,0xF803,0xF000,0x6000,

//Water
0x1805,0x2C0A,0x461C,0x8B78,0x1151,0x2362,0x45C4,0x8B88,0x1491,0x24A2,0x46C4,0x8B68,0x1131,0x3B22,0x7F64,0xAE68,0xE071,0x803B,0x001F,0x0000,

//Cabinet Open
0xFFFF,0x05A0,0x0660,0x05A0,0x0660,0xFDBF,0x0660,0xF5AF,0x6A6D,0xA4AA,0x626D,0xF2AF,0x0A60,0xF6EF,0x6A2D,0xA42A,0x622D,0xF22F,0x0A20,0xFE3F,

//Bad Man Left
0xF007,0xFC1F,0xFE3F,0xFE71,0x5FE0,0xFFFF,0xEF7D,0xCE3D,0x0C10,0x3810,0xD81F,0x2404,0x240C,0x2414,0xE413,0xBC16,0xD81D,0xA806,0xD805,0xFC1F,

//Bad Man Right
0xE00F,0xF83F,0xFC7F,0x8E7F,0x07FA,0xFFFF,0xBEF7,0xBC73,0x0830,0x081C,0xF81B,0x2024,0x3024,0x2824,0xC827,0x683D,0xB81B,0x6015,0xA01B,0xF83F,

//Rapid
0x98FF,0x5881,0xB800,0x9800,0x6800,0x5430,0x4A48,0x4548,0x6348,0x7148,0x7948,0x7D48,0x7F48,0x7F48,0x7F30,0x7F00,0x5F00,0x4F00,0xE7FF,0x1380,
0x0940,0xE5FF,0x5300,0x4900,0x6530,0x6348,0x7148,0x7948,0x7D48,0x7F48,0x7F48,0x7F48,0x7F48,0x7F30,0x5F00,0x4F00,0xE7FF,0x1340,0x0920,0xE5FF,
0x5300,0x4900,0x4530,0x6348,0x7148,0x7948,0x7D48,0x7F48,0x7F48,0x7F48,0x7F48,0x5F30,0x4F00,0xC7FF,0x2380,0x1140,0x8927,0xC513,0xE309,0xFF07,

//Track
0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,0x9851,0x98B1,

//Closestool
0xE007,0x1008,0xC813,0x2424,0x2424,0x2424,0x2424,0x2424,0xC813,0x1008,0xF00F,0x0810,0xE427,0xE427,0x0C30,0xF42F,0x0810,0x0810,0xF00F,0xF81F,

//Toilet paper
0x0000,0x1800,0xE800,0x0403,0x041C,0x0260,0x0240,0x0120,0x0660,0x7B50,0x9F73,0xED6C,0x3637,0xD878,0x6373,0xBC3D,0xC037,0x001C,0x0008,0x0000,

//Sad
0x0000,0x0000,0xE003,0x180C,0x0410,0x0220,0x0220,0x2142,0x0140,0x0140,0x0140,0xE143,0x1144,0x0A28,0x0220,0x0410,0x180C,0xE003,0x0000,0x0000,

//Asistant
0xC003,0xF00F,0x301E,0x181C,0x0C30,0x2672,0x0820,0x0820,0xC819,0x1008,0xF807,0x5E1F,0xD123,0xDF4F,0xF0BF,0xD04F,0x3007,0x980F,0xC41F,0x7C1E
};

//----------------------------------------------------------------
//int CheckStatus(void);
//void DrawGraphic(int x, int y, int iObjectID);
//void DrawMap(void);
//void DisplayMessage(int iObjectID, char *sMessage);
//int IsWalkable(void);
//void Talk(void);
//void Search(void);
//int DisplayManual(int x, int y, char sItems[][11], unsigned char *caObject, int iItemCount);
//void RapidMove(void);
//void RapidBack(void);
//----------------------------------------------------------------
int g_iThingCount;
char g_caThingBox[10];
char g_saThingBox[10][11];

char g_saMainManualItems[3][11]={
"交谈　　  ", "查看四周  ", "使用物品  "};

int g_iMainManualItemCount;
int g_iStory;
int man_x, man_y;
int map_x, map_y;
//----------------------------------------------------------------
//----------------------------------------------------------------
void DrawGraphic(int x, int y, int iObjectID)
{
  int iOffset;
  iOffset=iObjectID*OBJECT_DATA_SIZE;
  WriteBlock(x*16,y*20,16,20,1,iOffset+GraphicData);
}
//空间不足，暂时改为不传参数
//void DrawMap(int iMapX, int iMapY, int iManX, int iManY)
void DrawMap()
{
  int x, y;

  for (y=0; y<LCD_MAX_HEIGHT_OBJ; y=y+1) {
    for (x=0; x<LCD_MAX_WIDTH_OBJ; x=x+1) {
	    DrawGraphic(x, y, MapData[map_y+y][map_x+x]);
	}
  }
}
//----------------------------------------------------------------
void RapidMove()
{
  man_y=4;

  map_x=0;
  map_y=15;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=73;
  MapData[16][0]=74;
  MapData[17][0]=75;
  MapData[18][0]=76;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=74;
  MapData[16][0]=75;
  MapData[17][0]=76;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=75;
  MapData[16][0]=76;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=76;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);
}
//----------------------------------------------------------------
void RapidBack()
{
  MapData[15][0]=76;
  MapData[16][0]=76;
  MapData[17][0]=76;
  MapData[18][0]=76;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=75;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=74;
  MapData[16][0]=75;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=73;
  MapData[16][0]=74;
  MapData[17][0]=75;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[15][0]=76;
  MapData[16][0]=73;
  MapData[17][0]=74;
  MapData[18][0]=75;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);
}
//----------------------------------------------------------------
void DisplayMessage(int iObjectID, int sMessage)
{
  int iStrlen, iLines, iLastLineChars, i, iOffset, iCharIndex, x;
  char buffer[8];

  Block(1,60,159,79,0);
  Rectangle(20,60,159,79,1);
  DrawGraphic(0, 3, iObjectID);

  iStrlen=strlen(sMessage);
  iLines=iStrlen/20;
  iLastLineChars=iStrlen%20;
  iOffset=0;
  buffer[2]=0;
  for (i=0; i<iLines; i++) {
	x=24;
    for (iCharIndex=0; iCharIndex<10; iCharIndex=iCharIndex+1) {
      buffer[0]=*(sMessage+iOffset++);
      buffer[1]=*(sMessage+iOffset++);
      TextOut(x, 64, buffer, 1);
	  Delay(5);
	  x=x+12;
	}
	buffer[0]='>';
	buffer[1]='>';
	TextOut(x, 64, buffer, 1);
	Refresh();
    getchar();
  }
  if (iLastLineChars > 0) {
    x=24;
	iLastLineChars=iLastLineChars>>1;
    for (iCharIndex=0; iCharIndex<iLastLineChars; iCharIndex=iCharIndex+1) {
      buffer[0]=*(sMessage+iOffset++);
      buffer[1]=*(sMessage+iOffset++);
      TextOut(x, 64, buffer, 1);
	  Delay(5);
      x=x+12;
	}
	iLastLineChars=10-iLastLineChars;
    for (iCharIndex=0; iCharIndex<iLastLineChars; iCharIndex=iCharIndex+1) {
      buffer[0]=' ';
      buffer[1]=' ';
      TextOut(x, 64, buffer, 1);
      x=x+12;
	}
	Refresh();
    getchar();
   }
//  TextOut(16, 63, sMessage, 1);
}
//----------------------------------------------------------------
void PoliceSeekRichHouse()
{
  int iTempX, iTempY;
  int iMapX, iMapY;

  iMapX=map_x;
  iMapY=map_y;

  map_x=0;
  map_y=0;

  iTempY=man_y;
  man_y=4;
  DrawMap();

  DisplayMessage(OBJ_POLICE, "奇怪，隔壁屋子的警铃怎么会响，我得过去查查看");
  
  MapData[2][1]=OBJ_DRHOUSE4;
  for (iTempX=1; iTempX<=5; iTempX=iTempX+1) {
    DrawMap();
    DrawGraphic(iTempX, 3, OBJ_POLICE);
	Refresh();
    Delay(DELAY_TIME);
  }
  DrawMap();
  DrawGraphic(5, 2, OBJ_POLICE);
  Refresh();
  Delay(DELAY_TIME);
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);
	   
  //Police go away
  g_iStory=30;
  man_y=iTempY;
  map_x=iMapX;
  map_y=iMapY;
}
//----------------------------------------------------------------
void BadManGoAway()
{
  int iMapX, iMapY;

  iMapX=map_x;
  iMapY=map_y;
  map_x=21;
  map_y=25;
  MapData[27][24]=OBJ_BLANK;
  MapData[27][23]=OBJ_BADMANL;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  DisplayMessage(OBJ_BADMANR, "咦，厕所怎么漏水了，过去看看。");

  MapData[27][23]=OBJ_BLANK;
  MapData[26][23]=OBJ_BADMANL;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[26][23]=OBJ_BLANK;
  MapData[25][23]=OBJ_BADMANL;
  DrawMap();
  Refresh();
  Delay(DELAY_TIME);

  MapData[25][23]=OBJ_BLANK;
  MapData[22][26]=OBJ_BADMANL;
  map_x=iMapX;
  map_y=iMapY;
}
//----------------------------------------------------------------
void TheEnd()
{
  int x;

  ClearScreen();
  DisplayMessage(OBJ_BLANK, "-The End- ");
  DisplayMessage(OBJ_MAN, "等等，等等，怎么这样就结束了");
  DisplayMessage(OBJ_SAD, "没办法因为32K 的空间已经用完了");
  DisplayMessage(OBJ_MAN, "不行，我好不容易才救出博士，也要有个动画或什么的");
  DisplayMessage(OBJ_SMILE, "好吧");

  ClearScreen();
  x=1;
  DrawGraphic(x+4, 1, OBJ_MAN);
  DrawGraphic(x+5, 1, OBJ_DR);
  DisplayMessage(OBJ_DR, "糟了，他追来了");

  ClearScreen();
  x++;
  DrawGraphic(x, 1, OBJ_BADMANR);
  DrawGraphic(x+4, 1, OBJ_MAN2);
  DrawGraphic(x+5, 1, OBJ_DR);
  DisplayMessage(OBJ_BADMANR, "站住，别跑");
  
  ClearScreen();
  x++;
  DrawGraphic(x, 1, OBJ_BADMANR);
  DrawGraphic(x+4, 1, OBJ_MAN);
  DrawGraphic(x+5, 1, OBJ_DR);
  DisplayMessage(OBJ_MAN, "救命…救命…");

  ClearScreen();
  x++;
  DrawGraphic(x, 1, OBJ_BADMANR);
  DrawGraphic(x+4, 1, OBJ_MAN2);
  DrawGraphic(x+5, 1, OBJ_DR);
  DisplayMessage(OBJ_BADMANR, "站住，别跑");
  DisplayMessage(OBJ_MAN, "呜～我不要这样的结局动画");

  ClearScreen();
  DisplayMessage(OBJ_SMILE, "-The End- ");
  exit(0);
}
//----------------------------------------------------------------
void Thing_GetObjectName(char cThingID, int sName)
{
  if (cThingID==OBJ_SLINGSHOT) {
    strcpy(sName, "弹弓      ");
  }
  else if (cThingID==OBJ_TICKET) {
    strcpy(sName, "捷运车票  ");
  }
  else if (cThingID==OBJ_INVOICE) {
    strcpy(sName, "送修单据  ");
  }
  else if (cThingID==OBJ_CC800) {
    strcpy(sName, "CC800     ");
  }
  else if (cThingID==OBJ_TOILETPAPER) {
    strcpy(sName, "厕纸      ");
  }
  else {
    strcpy(sName, "细菌培养液");
  }
}
//----------------------------------------------------------------
void Thing_Exchange(char cOldThingID, char cNewThingID)
{
  int i;

  for (i=0; i<g_iThingCount; i=i+1) {
    if (g_caThingBox[i]==cOldThingID) {
	  g_caThingBox[i]=cNewThingID;
	  Thing_GetObjectName(cNewThingID, g_saThingBox[i]);
	  break;
	}
  }
}
//----------------------------------------------------------------
int Thing_Add(char cThingID)
{
  int i;

  for (i=0; i<g_iThingCount; i=i+1) {
    if (g_caThingBox[i]==cThingID) {
	  return 0;
//	  iResult=1;
//	  break;
	}
  }
/*  if (Thing_IsExist(cThingID)) {
    return 0;
  }*/
  g_caThingBox[g_iThingCount]=cThingID;
  Thing_GetObjectName(cThingID, g_saThingBox[g_iThingCount]);
  g_iThingCount++;
  return 1;
}
//----------------------------------------------------------------
int CheckStatus()
{
  char ch;
  int x, y, iStatus;

  iStatus=0;

  //取得人物的绝对座标
  x=map_x+man_x;
  y=map_y+man_y;

  //走进捷运站
  if (x==9 && y==6) {
    map_x=0;
	map_y=15;
	man_x=8;
	man_y=1;   
    iStatus=1;
  }

  //离开捷运站
  else if (x==9 && y==16) {
    map_x=5;
    map_y=5;
    man_x=4;
	man_y=2;
    iStatus=1;
  }

  //走进研究室
  else if (x==17 && y==6) {
    map_x=0;
	map_y=25;
	man_x=5;
	man_y=2;
    iStatus=1;
  }

  //离开研究室
  else if (x==5 && y==28) {
    map_x=13;
	map_y=5;
	man_x=4;
	man_y=2;

	//已经取得培养液
	if (g_iStory==40) {
  	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);

	  //被抓走
	  DisplayMessage(OBJ_MAN, "你们是谁，要做什么");
	  DisplayMessage(OBJ_BADMANR, "不要动，你跟博士的交情不错吧，请你跟我们走");  //我们手上有枪，
	  DisplayMessage(OBJ_MAN, "什么，你们是绑架博士的人");	
	  DisplayMessage(OBJ_BADMANR, "废话少说，快走");	  	  
	  map_x=21;
	  map_y=25;
	  man_x=5;
	  man_y=2;
  	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
	  DisplayMessage(OBJ_BADMANR, "希望你可以帮我们劝劝博士，叫他跟我们合作一点，否则你们永远走不出这里");	  	  
	  DisplayMessage(OBJ_MAN, "原来博士被关在这里");
  	}
    iStatus=1;
  }

  //走进自己家
  else if (x==12 && y==2) {
    map_x=11;
	map_y=16;
	man_x=1;
	man_y=2;
    iStatus=1;
  }

  //离开自己家
  else if (x==11 && y==18) {
    map_x=4;
    map_y=0;
    man_x=7;
    man_y=2;
    iStatus=1;    
  }

  //走进博士的屋子
  else if (x==1 && y==2) {
    map_x=11;
	map_y=21;
	man_x=2;
	man_y=1;
    iStatus=1;    
  }

  //走进远见大楼
  else if (x==26 && y==8) {
    map_x=11;
	map_y=25;
	man_x=8;
	man_y=2;
    iStatus=1;    
  }

  //离开远见大楼
  else if (x==20 && y==27) {
    map_x=20;
	map_y=7;
	man_x=6;
	man_y=2;
	iStatus=1;
  }  
  
  //走进捷运站2
  else if (x==22 && y==2) {
    map_x=0;
	map_y=15;
	man_x=1;
	man_y=2;
	RapidBack();
    iStatus=1;
  }

  //从博士屋子的后门离开
  else if (x==20 && y==23) {

    //已经拿到送修单
	//if (Thing_IsExist(OBJ_CABINET_OPEN)) {
    if (MapData[20][19]==OBJ_CABINET_OPEN) {
      map_x=0;
	  map_y=0;
	  man_x=4;
	  man_y=2;

	  //警察走回博士屋子的门口
	  MapData[2][1]=OBJ_POLICE;
	  iStatus=1;
	}

	//尚未拿到送修单，不能离开
	else {
	  man_x--;
      DisplayMessage(OBJ_MAN, "好不容易才进来博士的屋子，还没找到重要的东西前，我想还是先不要离开好了");
	  iStatus=1;
	}
  }

  //从博士屋子的前门离开
  else if (x==12 && y==23) {
    man_y--;
	DisplayMessage(OBJ_MAN, "警察可能已经回来了，不要从前门走，免得被发现");
	iStatus=1;
  }

  //走进捷运车箱
  else if (x==0 && (y>=16 && y<=18)) {
    RapidMove();
    map_x=20;
	map_y=1;
	man_x=2;
	man_y=2;
	DrawMap();
	DrawGraphic(man_x, man_y, OBJ_MAN);
	DisplayMessage(OBJ_MAN, "到达汐止了");
    iStatus=1;    
  }

  //通过捷运闸口
  else if (x==4 && (y==16 || y==18)) {
    MapData[y][x]=OBJ_DOORCLOSE;
    iStatus=1;    
  }

  //离开厕所
  else if (x==27 && y==23) {

    //如果已经拿到卫生纸
	//if (Thing_IsExist(OBJ_TOILETPAPER)) {
    if (g_iStory==50) {
      MapData[23][27]=OBJ_DOORCLOSE;
	  iStatus=1;
	}
  }

  //上床睡觉
  else if (x==19 && y==17) {
	DrawGraphic(man_x, man_y, OBJ_SLEEP);

	//已经和博士谈过话了
	if (g_iStory==10) {
  	  DisplayMessage(OBJ_SLEEP, "好想睡哦，ZZZ...");

	  SetScreen(0);
	  DisplayMessage(OBJ_BLANK, "隔天... ");

	  MapData[18][12]=OBJ_POLICE;
      map_x=11;
  	  map_y=16;
	  man_x=7;
  	  man_y=1;
	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);	  
      DisplayMessage(OBJ_MAN, "怎么一早就有警察来家里，我得去看看才行");
	  g_iStory=15;
	  iStatus=1;
	}
	else {
  	  DisplayMessage(OBJ_SLEEP, "我还不想睡觉，还是出去走走吧");
	  man_x--;
	  iStatus=1;
	}
  }
  return iStatus;
}
//----------------------------------------------------------------
int IsWalkable()
{
  char ch;
  
  ch=MapData[map_y+man_y][map_x+man_x];
 
  if (ch==OBJ_BLANK || ch==OBJ_DOOROPEN || ch==OBJ_RAPID5 || ch==OBJ_GLOBALVIEW7 ||
      ch==OBJ_STAIR1 || ch==OBJ_STAIR2 || ch==OBJ_OFFICE4 || ch==OBJ_HOME3 || ch==OBJ_BED ||
	  ch==OBJ_DRHOUSE4 || ch==OBJ_RAPIDCAR1 || ch==OBJ_RAPIDCAR2 || ch==OBJ_RAPIDCAR3) {
    return 1;
  }
  else {
    return 0;
  }
}
//----------------------------------------------------------------
int DisplayManual(int sItems, int caObject, int iItemCount) //
{
  int i, iBase, iThingIndex, x_dot, y_dot, iSelected, iTemp;
  char ch;

  iBase=0;
  iSelected=0;
  while (1) {
	Block(30, 19, 112, 79, 0);
	Rectangle(30, 19, 112, 79, 1);
    for (i=0; i<3; i++) {
	  iThingIndex=iBase+i;
      if (iThingIndex < iItemCount) {
	    if (caObject!=NULL) {
		  DrawGraphic(2, i+1, *(caObject+iThingIndex));
		  x_dot=50;
		}
		else {
		  x_dot=34;
		}
		y_dot=(i+1)*20+4;
		TextOut(x_dot, y_dot, sItems+iThingIndex*11, 1);
	  }
	  else {
	    break;
	  }
    }
    iTemp=(iSelected+1)*20+2;
    Block(x_dot , iTemp, x_dot+5*12-1, iTemp+15, 2);
	Refresh();
    ch=getchar();
    if (ch==UP_ARROW) {
	  if (iSelected > 0) {
  	    iSelected--;
	  }
	  else {
	    if (iBase > 0) {
  	      iBase--;
		}
	  }
    }
    else if (ch==DOWN_ARROW) {
	  if (iSelected < 2 && iSelected < iItemCount-1) {
  	    iSelected++;
	  }
	  else {
	    if (iBase < iItemCount-3) {
	      iBase++;
		}
	  }
    }
	else if (ch==KEY_ENTER) {
	  break;
	}
	else if (ch==KEY_ESC) {
	  return -1;
	}
  }
  return (iBase+iSelected);
}
//----------------------------------------------------------------
/*void InitialThingBox(void)
{

  g_iThingCount=2;
  g_caThingBox[0]=OBJ_MONEY;
  g_caThingBox[1]=OBJ_CELLPHONE;
//  g_caThingBox[2]=OBJ_CC800;

  strcpy(g_saThingBox[0], "钱        ");
  strcpy(g_saThingBox[1], "行动电话  ");
//  strcpy(g_saThingBox[2], "CC800     ");
}*/
//----------------------------------------------------------------
void Talk()
{
  int x, y;

  x=man_x+map_x;
  y=man_y+map_y;

  //在博士屋子的门外
  if ((x==1 && y==3)) {
    if (g_iStory==0) {
      DisplayMessage(OBJ_MAN, "博士，这么一个人站在门口发呆呢");
      DisplayMessage(OBJ_DR, "啊，是你呀，我最近有一项新研究成果要发表");
      DisplayMessage(OBJ_MAN, "那很好呀，为什么要烦恼呢");
      DisplayMessage(OBJ_DR, "我担心会有人会将我的成果用在不法的用途上");
      DisplayMessage(OBJ_DR, "而且我最近有被跟踪的感觉，还会接到不明的电话");
      DisplayMessage(OBJ_MAN, "不会吧，博士，要不要通知警方");
      DisplayMessage(OBJ_DR, "不行，不行，说不定是我太敏感了，不要惊动大家");
//      DisplayMessage(OBJ_DR, "很晚了，快回去睡吧");
	  g_iStory=10;
	}
	else if (g_iStory==10) {
      DisplayMessage(OBJ_DR, "很晚了，快回去睡吧");
	}

	//与警员在博士屋子门外交谈
	else {
	  if (MapData[2][1]==OBJ_POLICE) {
        DisplayMessage(OBJ_MAN, "警察先生，你为什么一直守在博士的家门口");
        DisplayMessage(OBJ_POLICE, "因为博士可能是在家中被绑架的，我们要封锁现场，准备进行调查");
        DisplayMessage(OBJ_MAN, "连我也不能进去吗");
        DisplayMessage(OBJ_POLICE, "当然，我们不能随意让人破坏现场");
        DisplayMessage(OBJ_MAN, "（看来我要进去博士的屋里，得先想办法引开这个警察才行）");
	  }
	}
  }

  //在家中
  else if (x==13 && y==18) {

    //与警员在家中交谈
    if (g_iStory==15) {
      DisplayMessage(OBJ_POLICE, "你好，我是警察，你的邻居博士失踪了，他昨晚可能遭人绑架");
      DisplayMessage(OBJ_MAN, "绑架! 怎么会呢? ");
      DisplayMessage(OBJ_POLICE, "他的屋子门锁有被破坏的痕迹，屋里也有被破坏，今早有人发现才来报案的");
      DisplayMessage(OBJ_POLICE, "博士有和人结怨吗? 或最近有发生过什么事吗? ");
      DisplayMessage(OBJ_MAN, "……");
      DisplayMessage(OBJ_MAN, "没有");
      DisplayMessage(OBJ_POLICE, "那昨晚你有听到什么声音，或看到什么可疑的人呢");
      DisplayMessage(OBJ_MAN, "没有，昨晚我睡得很好");
      DisplayMessage(OBJ_POLICE, "你如果有想起什么线索的话，请你再告诉警方");
      DisplayMessage(OBJ_MAN, "好的。");
	  g_iStory=20;

	  //警员离开
	  MapData[18][12]=OBJ_BLANK;
	  MapData[18][11]=OBJ_POLICE;
	  DrawMap();
      DrawGraphic(man_x, man_y, OBJ_MAN);

	  //delay(DELAY_TIME);
	  MapData[18][11]=OBJ_BLANK;

	  //警员站在博士屋子门外
	  MapData[2][1]=OBJ_POLICE;
	  DrawMap();
      DrawGraphic(man_x, man_y, OBJ_MAN);
      DisplayMessage(OBJ_MAN, "博士的失踪一定和昨天他提到的研究有关，");
      DisplayMessage(OBJ_MAN, "惊动警方可能对博士不利，我得自己救他出来。");
      DisplayMessage(OBJ_MAN, "先去博士的研究室看看好了，");
	}
	else {
      DisplayMessage(OBJ_MAN, "没有可交谈的人");
	}
  }

  //在远见大楼，哈电宝宝面前
  else if (x==15 && y==28) {
    DisplayMessage(OBJ_GIRL, "你好，我是哈电宝宝，有什么事吗");
    DisplayMessage(OBJ_MAN, "啊，你就是哈电宝宝呀，我想问…");
    DisplayMessage(OBJ_MAN, "晚上有没有空，我们一起吃饭吧");
    DisplayMessage(OBJ_GIRL, "什么? 你是为这个而来的吗? ");
    DisplayMessage(OBJ_MAN, "啊，不是啦，我是想拿回送修的cc800 ");
    DisplayMessage(OBJ_GIRL, "把送修的单据给我就可以了");
  }

  //在研究室和博士助理交谈
  else if ((x==7 && y==21) || (x==8 && y==22)) {
    if (g_iStory >= 20) {
      DisplayMessage(OBJ_ASSISTANT, "听说博士被绑架了，我好担心");
      DisplayMessage(OBJ_MAN, "别担心，我们正在想办法救他出来");
      DisplayMessage(OBJ_MAN, "你是博士的助理，你知道博士最近有什么研究吗");
      DisplayMessage(OBJ_ASSISTANT, "我不清楚，博士最近都自己关起来研究，只知道好像跟细菌有关");
      DisplayMessage(OBJ_MAN, "细菌? 那么你知道博士有记录事情的习惯吗? ");
      DisplayMessage(OBJ_ASSISTANT, "他有一台cc800 ，他都把事情记录在里面，不过前一阵子有问题，拿去送修了");
      DisplayMessage(OBJ_MAN, "（看来我得找出这台cc800 才行）");
	}
	else {
      DisplayMessage(OBJ_ASSISTANT, "你好，我是博士的助理");
      DisplayMessage(OBJ_MAN, "你好");
	}
  }

  //在监牢中和博士交谈
  else if ((x==28 && y==28) || (x==29 && y==27)) {

    //刚被囚禁时
    if (g_iStory==40) {
      DisplayMessage(OBJ_MAN, "博士，你不要紧吧，到底发生什么事了");
      DisplayMessage(OBJ_DR, "他们要我提供我最近研究成功的细菌合成方程式");
      DisplayMessage(OBJ_MAN, "细菌合成方程式？");
      DisplayMessage(OBJ_DR, "没错，是一种具有强力腐蚀性质的细菌");
      DisplayMessage(OBJ_MAN, "强力腐蚀？不会是从你柜子里拿来的这个吧");
      DisplayMessage(OBJ_DR, "没错，你怎么拿到的");
      DisplayMessage(OBJ_MAN, "糟了，我刚才有沾到一点在身上，我不会被腐蚀掉吧");
      DisplayMessage(OBJ_DR, "放心好了，这种细菌离开培养液后，很快就会死亡了");
      DisplayMessage(OBJ_DR, "而且要在有电流通过的时候，才会开始有腐蚀的效果，否则怎能用瓶子装着它");
      DisplayMessage(OBJ_MAN, "说得也是，那就好了");
      DisplayMessage(OBJ_DR, "别多说了，赶快想法子逃出这里才是");
	}

	//塞住马桶之后
	else if (g_iStory==50) {
      DisplayMessage(OBJ_MAN, "我把厕所的马桶堵住了，等一下漏水应该会引开守卫的");
      DisplayMessage(OBJ_DR, "希望可以成功");
      BadManGoAway();
	  g_iStory=60;
    }

	//守卫离开之后
	else if (g_iStory==60 || g_iStory==70) {
      DisplayMessage(OBJ_MAN, "成功了，守卫走开了");
      DisplayMessage(OBJ_DR, "我们赶快想办法离开");
	}
	else {
      DisplayMessage(OBJ_MAN, "...");
      DisplayMessage(OBJ_DR, "...");
	}
  }

  //在监牢之中和守卫谈话
  else if (x==26 && y==27) {
    if (MapData[y][x-2]==OBJ_BADMANR) {
      DisplayMessage(OBJ_MAN, "快放我们出去");
      DisplayMessage(OBJ_BADMANR, "在博士答应和我们合作之前，休想离开这里");
	}
  }
  else {
    DisplayMessage(OBJ_MAN, "没有可交谈的人");
  }
}
//----------------------------------------------------------------
void Search()
{
  int x, y;

  x=map_x+man_x;
  y=map_y+man_y;

  //在豪宅之前
  if (((x==5 || x==6 || x==7) && (y==3)) || (x==8 && y==2)) {
    DisplayMessage(OBJ_MAN, "这是博士家旁边的豪宅，很少看见有人进出，不过保全系统很严密，上次有只小鸟撞到窗户，还引起警铃大响，惊动了不少人。");
	return;
  }

  //在博士的屋子之前
  else if ((x==1 || x==2 || x==3) && (y==3)) {
    DisplayMessage(OBJ_MAN, "博士住在这屋子好几年了，我还蛮常来串门子的，他是一个和善的邻居。");
	return;
  }

  //在家里的柜子前
  else if (x==18 && y==17) {
    if (Thing_Add(OBJ_SLINGSHOT)) {
	  MapData[y-1][x]=OBJ_CABINET_OPEN;
	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
      DisplayMessage(OBJ_MAN, "柜子里有一个弹弓，这个弹弓是我以前小时候的玩具，以前我可是百发百中的神射手");
      DisplayMessage(OBJ_SLINGSHOT, "得到了弹弓");
  	  return;
	}
  }

  //在自动售票机前
  else if (x==7 && y==16) {
    DisplayMessage(OBJ_MAN, "这里有一台自动售票机");
	return;
  }

  //在捷运闸口
  else if (x==5 && (y==16 || y==18)) {
    DisplayMessage(OBJ_MAN, "刚好有一班车，不过我需要车票才能过去搭车");
	return;    
  }
  
  //博士屋子中的柜子
  else if (x==19 && y==21) {
    if (Thing_Add(OBJ_INVOICE)) {
	  MapData[y-1][x]=OBJ_CABINET_OPEN;
	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
      DisplayMessage(OBJ_MAN, "找到了，这里有一张cc800 的送修单据，今天刚好可以去拿回来，地点在汐止，看来我得赶快搭捷运过去才行");
	  DisplayMessage(OBJ_INVOICE, "得到了送修单");
  	  return;
	}
  }

  //研究室中的柜子
  else if (x==1 && y==21) {
    DisplayMessage(OBJ_MAN, "这个柜子被一个数字锁锁住了，博士是一个健忘的人，他应该会把号码记在某个地方");  
	return;
  }

  //在厕所中的柜子
  else if (x==26 && y==22) {

    //得到厕纸
    if (Thing_Add(OBJ_TOILETPAPER)) {
	  MapData[y-1][x]=OBJ_CABINET_OPEN;
	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
	  DisplayMessage(OBJ_MAN, "找到一大包厕纸，不怕拉肚子了");
	  DisplayMessage(OBJ_TOILETPAPER, "得到了厕纸");
	  return;
	}
  }

  //监牢中的门
  else if (x==29 && y==27) {
    DisplayMessage(OBJ_MAN, "这里有个门好像可以通到外面，不过锁得很紧打不开");
	return;
  }
  DisplayMessage(OBJ_MAN, "没有检查到什么");
}
//----------------------------------------------------------------
void UseThing()
{
  int iSelectID;
  char cThingID;
  int x, y;

  x=man_x+map_x;
  y=man_y+map_y;

  iSelectID=DisplayManual(g_saThingBox, g_caThingBox, g_iThingCount);
  if (iSelectID==-1) {
    return;
  }
  DrawMap();
  DrawGraphic(man_x, man_y, OBJ_MAN);
  cThingID=g_caThingBox[iSelectID];
  if (cThingID==OBJ_SLINGSHOT) {
     if (x==8 && y==2 && g_iStory==20) {
       DisplayMessage(OBJ_MAN, "看我的");
       DisplayMessage(OBJ_MAN, "啪，刚好打中窗户，看来我还是相当神准的");
       DisplayMessage(OBJ_MAN, "铃~~警铃开始响了");
	   PoliceSeekRichHouse();
	 }
	 else if ((x==5 || x==6 || x==7) && (y==3) && g_iStory==20) {
       DisplayMessage(OBJ_MAN, "在这里太明显，会被看到的");
	 }
	 else {
       DisplayMessage(OBJ_MAN, "我可不想惹上什么麻烦");
	 }
  }

  //买车票
  else if (x==7 && y==16 && cThingID==OBJ_MONEY) {
    Thing_Exchange(OBJ_MONEY, OBJ_TICKET); 
	DisplayMessage(OBJ_TICKET, "得到了车票");
  }

  //通过捷运闸口
  else if ((x==3 || x==5) && (y==16 || y==18) && cThingID==OBJ_TICKET) {
    MapData[y][4]=OBJ_DOOROPEN;  
  }

  //取得 cc800
  else if (x==15 && y==28 && cThingID==OBJ_INVOICE) {
    Thing_Exchange(OBJ_INVOICE, OBJ_CC800); 
    DisplayMessage(OBJ_MAN, "这是我的cc800 送修的单据");
    DisplayMessage(OBJ_GIRL, "好，请等一下");
    DisplayMessage(OBJ_GIRL, "这是修好的cc800 ，要好好保管哦");
    DisplayMessage(OBJ_MAN, "好的，我一定会的");
    DisplayMessage(OBJ_MAN, "（里面有博士实验室里柜子的数字锁密码，我可以用这个去打开他的柜子了）");
	DisplayMessage(OBJ_CC800, "得到了 cc800");
  }

  //取得培养液
  else if (x==1 && y==21 && cThingID==OBJ_CC800) {
    if (Thing_Add(OBJ_CHEMICAL)) {
	  MapData[y-1][x]=OBJ_CABINET_OPEN;
	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
      DisplayMessage(OBJ_MAN, "在博士的柜子里，找到了一罐奇怪的药水，不知有什么用途。");
      DisplayMessage(OBJ_MAN, "可能和他最近的研究有关，希望可以找出一些有关他被绑架的线索。");
	  DisplayMessage(OBJ_CHEMICAL, "得到了培养液");
	  g_iStory=40;
	  MapData[7][16]=OBJ_BADMANR;
	  MapData[7][18]=OBJ_BADMANL;
	}    
  }

  //塞住马桶
  else if (((x==26 && y==22) || (x==25 && y==23)) && cThingID==OBJ_TOILETPAPER ) {
    DisplayMessage(OBJ_MAN, "这样把马桶堵住，等一下就会溢出很多水来引起注意了");
	MapData[23][25]=OBJ_WATER;
    g_iStory=50;  
  }

  //使用细菌培养液和手机逃出监牢
  else if (x==29 && y==27) {
    if (g_iStory==60 && cThingID==OBJ_CHEMICAL) {
      DisplayMessage(OBJ_MAN, "我把药水涂在门上了，接下来等通上电就可以了");
      g_iStory=70;
	}
	else if (g_iStory==70 && cThingID==OBJ_CELLPHONE) {
      DisplayMessage(OBJ_MAN, "还好行动电话的电池还有电，把线路改一下，就可以放出电了");
	  MapData[27][30]=OBJ_BLANK;
  	  DrawMap();
	  DrawGraphic(man_x, man_y, OBJ_MAN);
      DisplayMessage(OBJ_MAN, "哇，门一下子就溶掉了，太可怕了");
      DisplayMessage(OBJ_DR, "我们快逃走吧");
      g_iStory=80;

	  //The End
	  TheEnd();
	}

    else if (g_iStory < 60) {
	  if (g_iStory >= 60) {
        DisplayMessage(OBJ_MAN, "没有作用");	  
	  }
	  else {
        DisplayMessage(OBJ_MAN, "有人还在门口监视，太危险了会被发现的，我得引开他才行");	  
	  }
	}
  }

  //使用行动电话
  else if (cThingID==OBJ_CELLPHONE) {
    DisplayMessage(OBJ_MAN, "嘟嘟…收不到讯号，这个行动电话真差，总是收不到讯号，打不出去");
  }

  //贿赂警员
  else if ((x==1 && y==3) && cThingID==OBJ_MONEY && MapData[2][1]==OBJ_POLICE) {
    DisplayMessage(OBJ_POLICE, "你敢贿赂警员，这可是重罪");
    DisplayMessage(OBJ_MAN, "不敢，不敢");    
  }

  else {
    DisplayMessage(OBJ_MAN, "没有作用");
  }
}
//----------------------------------------------------------------
void main()
{
  int x, y;
  int ch;
  int iDrawTimes;
  int iSelectID;
//  int man_x, man_y;
//  int map_x, map_y;

  g_iStory=0;
  g_iMainManualItemCount=3;

  g_iThingCount=2;
  g_caThingBox[0]=OBJ_MONEY;
  g_caThingBox[1]=OBJ_CELLPHONE;
  strcpy(g_saThingBox[0], "钱        ");
  strcpy(g_saThingBox[1], "行动电话  ");

//  InitialThingBox();

  man_x=7;
  man_y=2;
  map_x=4;
  map_y=0;
  iDrawTimes=0;
  DrawMap();
  DrawGraphic(man_x, man_y, OBJ_MAN);
  Refresh();
  for (;;) {
        ch=getchar();
	if (ch==LEFT_ARROW) {
	  if (man_x > LCD_WIDTH_START) {
	    man_x--;
		if (IsWalkable()) {
		  if (man_x==LCD_WIDTH_START) {
		    if (map_x > 0) {
		      map_x--;
			  man_x++;
		    }
		  }
		}
		else {
		  man_x++;
		}
	  }
	}
	else if (ch==RIGHT_ARROW) {
	  if (man_x < LCD_WIDTH_END) {
  	    man_x++;
		if (IsWalkable()) {
		  if (man_x==LCD_WIDTH_END) {
		    if (map_x < MAP_MAX_WIDTH_OBJ-LCD_MAX_WIDTH_OBJ) {
		      map_x++;
			  man_x--;
		    }
	 	  } 
		}
		else {
		  man_x--;
		}
	  }
	}
	else if (ch==UP_ARROW) {
	  if (man_y > LCD_HEIGHT_START) {
	    man_y--;
		if (IsWalkable()) {
  	      if (man_y==LCD_HEIGHT_START) {
 	        if (map_y > 0) {
		      map_y--;
	          man_y++;
	  	    }
	      }
		}
		else {
		  man_y++;
		}

	  }
	}
	else if (ch==DOWN_ARROW) {
	  if (man_y < LCD_HEIGHT_END) {
	    man_y++;
		if (IsWalkable()) {
	      if (man_y==LCD_HEIGHT_END) {
		    if (map_y < MAP_MAX_HEIGHT_OBJ-LCD_MAX_HEIGHT_OBJ) {
		      map_y++;
			  man_y--;
		    }
		  }
	    }
		else {
		  man_y--;
		}
	  }
	}
	else if (ch==KEY_ENTER) {
	  iSelectID=DisplayManual(g_saMainManualItems, NULL, g_iMainManualItemCount);
	  if (iSelectID==TALK) {
	    DrawMap();
		DrawGraphic(man_x, man_y, OBJ_MAN);
	    Talk();
	  }
	  else if (iSelectID==SEARCH) {
	    DrawMap();
		DrawGraphic(man_x, man_y, OBJ_MAN);
	    Search();
	  }
	  else if (iSelectID==USE) {
	    DrawMap();
		DrawGraphic(man_x, man_y, OBJ_MAN);
	    UseThing();
	  }
	}
	else if (ch==KEY_HELP) {
	  SetScreen(1);
	  strcpy(_TEXT, "游戏中按下Enter 会出现‘交谈’、‘查看’、‘使用物品’的选项，游戏并不难，和遇见的人交谈，多查看四周环境应该就可以顺利的进行游戏。");
	  UpdateLCD(0);
	  getchar();	  
	  SetScreen(1);
	  strcpy(_TEXT, "感谢网路上每个帮我解答疑问的网友，另外本游戏中的人物及建物，是由丹尼斯国际提供，特别感谢。");
	  UpdateLCD(0);
	  getchar();	  
	  SetScreen(1);
	  strcpy(_TEXT, "如果有任何问题的话，请 E-mail 给我，我的 E-mail是 nothing@ms11.url.com.tw");
	  UpdateLCD(0);
	  getchar();	  	  
	}

	DrawMap();

	x=map_x+man_x;
	y=map_y+man_y;

    if (iDrawTimes%2) {
      DrawGraphic(man_x, man_y, OBJ_MAN);
    }
    else {
      DrawGraphic(man_x, man_y, OBJ_MAN2);
    }
	Refresh();

	if (CheckStatus()) {
	  iDrawTimes=0;
	  Delay(100);
	  DrawMap();
      DrawGraphic(man_x, man_y, OBJ_MAN);
	  Refresh();
	}
    iDrawTimes++;
  }
}
//----------------------------------------------------------------

