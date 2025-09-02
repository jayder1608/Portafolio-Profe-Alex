
import 'dart:math';

class Persona {
  String nombre;
  int edad;

  Persona(this.nombre, this.edad);

  void mostrar() {
    print('Nombre: \$nombre, Edad: \$edad');
  }
}
class Boxeador extends Persona {
  int fuerza;
  int resistencia;
  int velocidad;
  int energia = 100;

  Boxeador(String nombre, int edad, this.fuerza, this.resistencia, this.velocidad)
      : super(nombre, edad);

  int atacar(Boxeador oponente) {
    bool critico = Random().nextDouble() < 0.2;
    int golpeBase = fuerza;
    int golpe = critico ? golpeBase * 2 : golpeBase;

    int dano = golpe - oponente.resistencia;
    dano = dano < 0 ? 0 : dano;

    oponente.energia -= dano;
    oponente.energia = oponente.energia < 0 ? 0 : oponente.energia;

    print('\$nombre golpea a \${oponente.nombre} '
        '\${critico ? "(Golpe crítico!)" : ""} '
        'causando \$dano de daño. Energía restante de \${oponente.nombre}: \${oponente.energia}');
    return dano;
  }
}

void simularCombate(Boxeador b1, Boxeador b2, bool automatico) {
  print('\n¡Comienza el combate entre \${b1.nombre} y \${b2.nombre}!');
  int turno = 1;

  while (b1.energia > 0 && b2.energia > 0) {
    print('\n--- Turno \$turno ---');

    Boxeador primero = b1.velocidad >= b2.velocidad ? b1 : b2;
    Boxeador segundo = primero == b1 ? b2 : b1;

    if (!automatico) {
      print('Presiona ENTER para el turno...');

    }

    primero.atacar(segundo);
    if (segundo.energia > 0) {
      segundo.atacar(primero);
    }

    turno++;
  }

  print('\n--- Combate Finalizado ---');
  if (b1.energia <= 0 && b2.energia <= 0) {
    print('¡Es un empate!');
  } else if (b1.energia <= 0) {
    print('¡\${b2.nombre} es el ganador!');
  } else {
    print('¡\${b1.nombre} es el ganador!');
  }
}


void main() {
  Boxeador boxeador1 = Boxeador('Carlos', 28, 30, 20, 15);
  Boxeador boxeador2 = Boxeador('Miguel', 30, 25, 25, 18);

  boxeador1.mostrar();
  boxeador2.mostrar();

  bool automatico = true;
  simularCombate(boxeador1, boxeador2, automatico);
}
